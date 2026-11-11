import { getSqliteDatabase } from "./sqlite.client";

const R = 5;
const ALPHA = Math.fround(0.01);
const R_ALPHA = Math.fround(R * ALPHA);
const LOG_UNIFORM_PRIOR = Math.fround(-Math.log(R));

interface FoldCache {
  readonly fold: number;
  readonly users: Int32Array;
  readonly items: Int32Array;
  readonly allCandidateItems: Int32Array;
  readonly userToPos: Map<number, number>;
  readonly itemToPos: Map<number, number>;
  // CSR per user (baris = u_pos, kolom = i_pos, nilai = rating 0..4)
  readonly userRowOffsets: Int32Array;
  readonly userRowItems: Int32Array;
  readonly userRowRatings: Uint8Array;
  readonly userLogPrior: Float32Array; // (n_users * 5)
  // CSR per item (baris = i_pos, kolom = u_pos, nilai = rating 0..4)
  readonly itemRowOffsets: Int32Array;
  readonly itemRowUsers: Int32Array;
  readonly itemRowRatings: Uint8Array;
  readonly itemLogPrior: Float32Array; // (n_items * 5)
}

const foldCacheMap = new Map<number, FoldCache>();

function getFoldCache(fold: number): FoldCache {
  const cached = foldCacheMap.get(fold);
  if (cached) return cached;

  const db = getSqliteDatabase();
  const trainRows = db
    .prepare(
      "SELECT user_id, item_id, rating FROM ratings_train WHERE fold = ? ORDER BY user_id ASC, item_id ASC"
    )
    .all(fold) as unknown as {
    user_id: number;
    item_id: number;
    rating: number;
  }[];

  const testItemRows = db
    .prepare("SELECT DISTINCT item_id FROM ratings_test WHERE fold = ?")
    .all(fold) as unknown as { item_id: number }[];

  const userSet = new Set<number>();
  const itemSet = new Set<number>();
  const allItemSet = new Set<number>();

  for (const r of trainRows) {
    userSet.add(Number(r.user_id));
    itemSet.add(Number(r.item_id));
    allItemSet.add(Number(r.item_id));
  }
  for (const r of testItemRows) {
    allItemSet.add(Number(r.item_id));
  }

  const users = Int32Array.from(Array.from(userSet).sort((a, b) => a - b));
  const items = Int32Array.from(Array.from(itemSet).sort((a, b) => a - b));
  const allCandidateItems = Int32Array.from(
    Array.from(allItemSet).sort((a, b) => a - b)
  );

  const userToPos = new Map<number, number>();
  for (let idx = 0; idx < users.length; idx++) {
    userToPos.set(users[idx], idx);
  }

  const itemToPos = new Map<number, number>();
  for (let idx = 0; idx < items.length; idx++) {
    itemToPos.set(items[idx], idx);
  }

  const nUsers = users.length;
  const nItems = items.length;
  const nnz = trainRows.length;

  // Bangun CSR User -> Item
  const userCounts = new Int32Array(nUsers);
  const itemCounts = new Int32Array(nItems);
  for (const r of trainRows) {
    const uPos = userToPos.get(Number(r.user_id))!;
    const iPos = itemToPos.get(Number(r.item_id))!;
    userCounts[uPos]++;
    itemCounts[iPos]++;
  }

  const userRowOffsets = new Int32Array(nUsers + 1);
  for (let u = 0; u < nUsers; u++) {
    userRowOffsets[u + 1] = userRowOffsets[u] + userCounts[u];
  }

  const itemRowOffsets = new Int32Array(nItems + 1);
  for (let i = 0; i < nItems; i++) {
    itemRowOffsets[i + 1] = itemRowOffsets[i] + itemCounts[i];
  }

  const userRowItems = new Int32Array(nnz);
  const userRowRatings = new Uint8Array(nnz);
  const userWriteCursor = Int32Array.from(userRowOffsets.subarray(0, nUsers));

  const itemRowUsers = new Int32Array(nnz);
  const itemRowRatings = new Uint8Array(nnz);
  const itemWriteCursor = Int32Array.from(itemRowOffsets.subarray(0, nItems));

  const userRatingHist = new Int32Array(nUsers * R);
  const itemRatingHist = new Int32Array(nItems * R);

  for (const r of trainRows) {
    const uPos = userToPos.get(Number(r.user_id))!;
    const iPos = itemToPos.get(Number(r.item_id))!;
    const k = Number(r.rating) - 1;

    const uIdx = userWriteCursor[uPos]++;
    userRowItems[uIdx] = iPos;
    userRowRatings[uIdx] = k;
    userRatingHist[uPos * R + k]++;

    const iIdx = itemWriteCursor[iPos]++;
    itemRowUsers[iIdx] = uPos;
    itemRowRatings[iIdx] = k;
    itemRatingHist[iPos * R + k]++;
  }

  const userLogPrior = new Float32Array(nUsers * R);
  for (let u = 0; u < nUsers; u++) {
    const total = userRowOffsets[u + 1] - userRowOffsets[u];
    const denom = Math.fround(total + R_ALPHA);
    for (let c = 0; c < R; c++) {
      const num = Math.fround(userRatingHist[u * R + c] + ALPHA);
      userLogPrior[u * R + c] = Math.fround(
        Math.log(Math.fround(num / denom))
      );
    }
  }

  const itemLogPrior = new Float32Array(nItems * R);
  for (let i = 0; i < nItems; i++) {
    const total = itemRowOffsets[i + 1] - itemRowOffsets[i];
    const denom = Math.fround(total + R_ALPHA);
    for (let c = 0; c < R; c++) {
      const num = Math.fround(itemRatingHist[i * R + c] + ALPHA);
      itemLogPrior[i * R + c] = Math.fround(
        Math.log(Math.fround(num / denom))
      );
    }
  }

  const built: FoldCache = {
    fold,
    users,
    items,
    allCandidateItems,
    userToPos,
    itemToPos,
    userRowOffsets,
    userRowItems,
    userRowRatings,
    userLogPrior,
    itemRowOffsets,
    itemRowUsers,
    itemRowRatings,
    itemLogPrior,
  };

  foldCacheMap.set(fold, built);
  return built;
}

const clusterCacheMap = new Map<
  string,
  { userClusters: Int32Array; itemClusters: Int32Array }
>();

function loadClusterLabels(
  fold: number,
  ku: number,
  ki: number,
  cache: FoldCache
): { userClusters: Int32Array; itemClusters: Int32Array } {
  const key = `v2:${fold}:${ku}:${ki}`;
  const cached = clusterCacheMap.get(key);
  if (cached) return cached;

  const db = getSqliteDatabase();
  const userClusters = new Int32Array(cache.users.length).fill(-1);
  const itemClusters = new Int32Array(cache.items.length).fill(-1);

  if (ku > 0) {
    const uRows = db
      .prepare(
        "SELECT user_id, cluster FROM user_clusters WHERE fold = ? AND k = ?"
      )
      .all(fold, ku) as unknown as { user_id: number; cluster: number }[];
    for (const r of uRows) {
      const pos = cache.userToPos.get(Number(r.user_id));
      if (pos !== undefined) {
        userClusters[pos] = Number(r.cluster);
      }
    }
  }

  if (ki > 0) {
    const iRows = db
      .prepare(
        "SELECT item_id, cluster FROM item_clusters WHERE fold = ? AND k = ?"
      )
      .all(fold, ki) as unknown as { item_id: number; cluster: number }[];
    for (const r of iRows) {
      const pos = cache.itemToPos.get(Number(r.item_id));
      if (pos !== undefined) {
        itemClusters[pos] = Number(r.cluster);
      }
    }
  }

  const res = { userClusters, itemClusters };
  clusterCacheMap.set(key, res);
  return res;
}

/**
 * Konversi float32 -> float16 -> float32 persis seperti `_store` di Python (`np.clip(x, -6e4, 6e4).astype(np.float16)`).
 * Menggunakan pembulatan IEEE-754 half-precision (10-bit mantissa, round-to-nearest-even) murni dengan Float32Array.
 */
const f32Buf = new Float32Array(1);
const u32Buf = new Uint32Array(f32Buf.buffer);

function roundFloat16(val: number): number {
  const clipped = Math.max(-6e4, Math.min(6e4, val));
  f32Buf[0] = clipped;
  const x = u32Buf[0];
  const exp = (x >>> 23) & 0xff;
  if (exp === 0) return 0;
  // Normal float16 range: bulatkan 13 bit mantissa terbawah (round-to-nearest-even)
  const rem = x & 0x1fff;
  const odd = (x & 0x2000) !== 0;
  u32Buf[0] =
    rem > 0x1000 || (rem === 0x1000 && odd)
      ? (x + 0x1000) & 0xffffe000
      : x & 0xffffe000;
  return f32Buf[0];
}

/**
 * Persis seperti fungsi Python `argmax_score(post)`:
 * Rating prediksi (argmax + 1); seri diputus margin kelas terbaik - kedua terbaik.
 */
export function argmaxScore(lp: Float32Array, offset: number): {
  pred: number;
  score: number;
} {
  let bestIdx = 0;
  let bestVal = lp[offset];
  let secondVal = -Infinity;

  for (let c = 1; c < R; c++) {
    const v = lp[offset + c];
    if (v > bestVal) {
      secondVal = bestVal;
      bestVal = v;
      bestIdx = c;
    } else if (v > secondVal) {
      secondVal = v;
    }
  }

  const pred = bestIdx + 1;
  const margin = Math.fround(bestVal - secondVal);
  const score = Math.fround(pred + Math.fround(margin / Math.fround(1.0 + margin)));
  return { pred, score };
}

export interface ComputedCandidateResult {
  readonly candidateItems: Int32Array;
  readonly basePosteriors: Float32Array; // (nq * 5)
  readonly clusterPosteriors: Float32Array; // (nq * 5)
  readonly baseTimeMs: number;
  readonly clusterTimeMs: number;
}

/**
 * Menghitung log-posterior hybrid NBCF Biasa (ku=0, ki=0) dan NBCF + Klaster (ku, ki)
 * secara terpisah agar waktu eksekusi masing-masing metode dapat diukur secara akurat.
 */
export function computeUserCandidatePosteriors(
  fold: number,
  userId: number,
  ku: number,
  ki: number
): ComputedCandidateResult {
  const cache = getFoldCache(fold);
  const uPos = cache.userToPos.get(userId) ?? -1;
  const nUsers = cache.users.length;

  // Tentukan daftar kandidat: semua item (train U test) dikurangi item yang sudah dirating user di train
  const seenTrainItems = new Set<number>();
  if (uPos >= 0) {
    const s = cache.userRowOffsets[uPos];
    const e = cache.userRowOffsets[uPos + 1];
    for (let idx = s; idx < e; idx++) {
      seenTrainItems.add(cache.items[cache.userRowItems[idx]]);
    }
  }

  const candList: number[] = [];
  for (let i = 0; i < cache.allCandidateItems.length; i++) {
    const itemId = cache.allCandidateItems[i];
    if (!seenTrainItems.has(itemId)) {
      candList.push(itemId);
    }
  }
  const candidateItems = Int32Array.from(candList);
  const nq = candidateItems.length;
  const candItemPos = new Int32Array(nq);
  for (let q = 0; q < nq; q++) {
    candItemPos[q] = cache.itemToPos.get(candidateItems[q]) ?? -1;
  }

  const { userClusters, itemClusters } = loadClusterLabels(fold, ku, ki, cache);

  const prior_i = new Float32Array(R);
  if (uPos >= 0) {
    for (let r = 0; r < R; r++) {
      prior_i[r] = cache.userLogPrior[uPos * R + r];
    }
  } else {
    prior_i.fill(LOG_UNIFORM_PRIOR);
  }

  const uStart = uPos >= 0 ? cache.userRowOffsets[uPos] : 0;
  const uEnd = uPos >= 0 ? cache.userRowOffsets[uPos + 1] : 0;
  const numNbItems = uEnd - uStart;

  // ============================================================================
  // A. EKSEKUSI STANDALONE NBCF BIASA (ku = 0, ki = 0)
  // ============================================================================
  const tBaseStart = performance.now();

  // 1A. Item-Based NBCF Biasa (seluruh neighbor user)
  const D_i_base = new Float32Array(nUsers * R);
  const T_i_base = new Float32Array(R * nUsers * R);

  if (uPos >= 0) {
    for (let idx = uStart; idx < uEnd; idx++) {
      const featItemPos = cache.userRowItems[idx];
      const uRatingIdx = cache.userRowRatings[idx];
      const iStart = cache.itemRowOffsets[featItemPos];
      const iEnd = cache.itemRowOffsets[featItemPos + 1];
      for (let j = iStart; j < iEnd; j++) {
        const nbUserPos = cache.itemRowUsers[j];
        const nbRatingIdx = cache.itemRowRatings[j];
        D_i_base[nbUserPos * R + uRatingIdx] += 1.0;
        T_i_base[(nbRatingIdx * nUsers + nbUserPos) * R + uRatingIdx] += 1.0;
      }
    }
  }

  const L_i_base = new Float32Array(nUsers * R * R);
  if (uPos >= 0) {
    for (let nb = 0; nb < nUsers; nb++) {
      for (let k = 0; k < R; k++) {
        const baseL = (nb * R + k) * R;
        const baseT = (k * nUsers + nb) * R;
        const baseD = nb * R;
        for (let r = 0; r < R; r++) {
          const num = Math.fround(T_i_base[baseT + r] + ALPHA);
          const den = Math.fround(D_i_base[baseD + r] + R_ALPHA);
          L_i_base[baseL + r] = Math.fround(Math.log(Math.fround(num / den)));
        }
      }
    }
  }

  const post_i_base = new Float32Array(nq * R);
  const pw_i_base = new Float32Array(nq);
  const full_i = new Float32Array(R);

  for (let q = 0; q < nq; q++) {
    const bPos = candItemPos[q];
    full_i.fill(0);
    let lens = 0;

    if (bPos >= 0) {
      const iStart = cache.itemRowOffsets[bPos];
      const iEnd = cache.itemRowOffsets[bPos + 1];
      lens = iEnd - iStart;
      if (uPos >= 0) {
        for (let j = iStart; j < iEnd; j++) {
          const nbUserPos = cache.itemRowUsers[j];
          const k = cache.itemRowRatings[j];
          const lOff = (nbUserPos * R + k) * R;
          for (let r = 0; r < R; r++) {
            full_i[r] = Math.fround(full_i[r] + L_i_base[lOff + r]);
          }
        }
      }
    }

    pw_i_base[q] = Math.fround(1.0 / (1.0 + lens));
    const qOff = q * R;
    for (let r = 0; r < R; r++) {
      post_i_base[qOff + r] = Math.fround(prior_i[r] + full_i[r]);
    }
  }

  // 2A. User-Based NBCF Biasa (seluruh neighbor item)
  const nbItemPosList = new Int32Array(numNbItems);
  const nbItemRatingList = new Uint8Array(numNbItems);
  const userToNbOffsets = new Int32Array(nUsers + 1);
  const tempCounts = new Int32Array(nUsers);

  for (let j = 0; j < numNbItems; j++) {
    const nbItemPos = cache.userRowItems[uStart + j];
    const k = cache.userRowRatings[uStart + j];
    nbItemPosList[j] = nbItemPos;
    nbItemRatingList[j] = k;

    const s = cache.itemRowOffsets[nbItemPos];
    const e = cache.itemRowOffsets[nbItemPos + 1];
    for (let idx = s; idx < e; idx++) {
      tempCounts[cache.itemRowUsers[idx]]++;
    }
  }

  for (let u = 0; u < nUsers; u++) {
    userToNbOffsets[u + 1] = userToNbOffsets[u] + tempCounts[u];
  }

  const totalLinks = userToNbOffsets[nUsers];
  const userToNbIdx = new Int32Array(totalLinks);
  const userToNbSameRating = new Uint8Array(totalLinks);
  const writeCur = Int32Array.from(userToNbOffsets.subarray(0, nUsers));

  for (let j = 0; j < numNbItems; j++) {
    const nbItemPos = nbItemPosList[j];
    const k = nbItemRatingList[j];
    const s = cache.itemRowOffsets[nbItemPos];
    const e = cache.itemRowOffsets[nbItemPos + 1];
    for (let idx = s; idx < e; idx++) {
      const wUser = cache.itemRowUsers[idx];
      const wRating = cache.itemRowRatings[idx];
      const pos = writeCur[wUser]++;
      userToNbIdx[pos] = j;
      userToNbSameRating[pos] = wRating === k ? 1 : 0;
    }
  }

  const basePosteriors = new Float32Array(nq * R);
  const D_u_base = new Float32Array(numNbItems * R);
  const T_u_base = new Float32Array(numNbItems * R);
  const full_u = new Float32Array(R);
  const pw_u_b = Math.fround(1.0 / (1.0 + numNbItems));

  for (let q = 0; q < nq; q++) {
    const aPos = candItemPos[q];
    full_u.fill(0);

    if (aPos >= 0 && numNbItems > 0) {
      D_u_base.fill(0);
      T_u_base.fill(0);

      const iStart = cache.itemRowOffsets[aPos];
      const iEnd = cache.itemRowOffsets[aPos + 1];
      for (let idx = iStart; idx < iEnd; idx++) {
        const wUser = cache.itemRowUsers[idx];
        const r = cache.itemRowRatings[idx];
        const lStart = userToNbOffsets[wUser];
        const lEnd = userToNbOffsets[wUser + 1];
        for (let l = lStart; l < lEnd; l++) {
          const j = userToNbIdx[l];
          const dIdx = j * R + r;
          D_u_base[dIdx] += 1.0;
          if (userToNbSameRating[l] === 1) {
            T_u_base[dIdx] += 1.0;
          }
        }
      }

      for (let j = 0; j < numNbItems; j++) {
        const jOff = j * R;
        for (let r = 0; r < R; r++) {
          const num = Math.fround(T_u_base[jOff + r] + ALPHA);
          const den = Math.fround(D_u_base[jOff + r] + R_ALPHA);
          const lv = Math.fround(Math.log(Math.fround(num / den)));
          full_u[r] = Math.fround(full_u[r] + lv);
        }
      }
    }

    const pw_i_b = pw_i_base[q];
    const qOff = q * R;
    for (let r = 0; r < R; r++) {
      const pr_u =
        aPos >= 0 ? cache.itemLogPrior[aPos * R + r] : LOG_UNIFORM_PRIOR;
      const post_u_b = Math.fround(pr_u + full_u[r]);
      const hybBase = Math.fround(
        Math.fround(pw_i_b * post_i_base[qOff + r]) +
          Math.fround(pw_u_b * post_u_b)
      );
      basePosteriors[qOff + r] = roundFloat16(hybBase);
    }
  }

  const tBaseEnd = performance.now();
  const baseTimeMs = tBaseEnd - tBaseStart;

  // ============================================================================
  // B. EKSEKUSI STANDALONE NBCF + KLASTER (ku, ki)
  // ============================================================================
  const tClusStart = performance.now();
  const targetUserCluster = uPos >= 0 ? userClusters[uPos] : -1;

  // 1B. Item-Based NBCF + Klaster (hanya menghitung neighbor user dalam klaster yang sama)
  const D_i_clus = new Float32Array(nUsers * R);
  const T_i_clus = new Float32Array(R * nUsers * R);

  if (uPos >= 0) {
    for (let idx = uStart; idx < uEnd; idx++) {
      const featItemPos = cache.userRowItems[idx];
      const uRatingIdx = cache.userRowRatings[idx];
      const iStart = cache.itemRowOffsets[featItemPos];
      const iEnd = cache.itemRowOffsets[featItemPos + 1];
      for (let j = iStart; j < iEnd; j++) {
        const nbUserPos = cache.itemRowUsers[j];
        if (ku === 0 || userClusters[nbUserPos] === targetUserCluster) {
          const nbRatingIdx = cache.itemRowRatings[j];
          D_i_clus[nbUserPos * R + uRatingIdx] += 1.0;
          T_i_clus[(nbRatingIdx * nUsers + nbUserPos) * R + uRatingIdx] += 1.0;
        }
      }
    }
  }

  const L_i_clus = new Float32Array(nUsers * R * R);
  if (uPos >= 0) {
    for (let nb = 0; nb < nUsers; nb++) {
      if (ku > 0 && userClusters[nb] !== targetUserCluster) continue;
      for (let k = 0; k < R; k++) {
        const baseL = (nb * R + k) * R;
        const baseT = (k * nUsers + nb) * R;
        const baseD = nb * R;
        for (let r = 0; r < R; r++) {
          const num = Math.fround(T_i_clus[baseT + r] + ALPHA);
          const den = Math.fround(D_i_clus[baseD + r] + R_ALPHA);
          L_i_clus[baseL + r] = Math.fround(Math.log(Math.fround(num / den)));
        }
      }
    }
  }

  const post_i_clus = new Float32Array(nq * R);
  const pw_i_clus = new Float32Array(nq);
  const filt_i = new Float32Array(R);

  for (let q = 0; q < nq; q++) {
    const bPos = candItemPos[q];
    filt_i.fill(0);
    let lens = 0;
    let cnt = 0;

    if (bPos >= 0) {
      const iStart = cache.itemRowOffsets[bPos];
      const iEnd = cache.itemRowOffsets[bPos + 1];
      lens = iEnd - iStart;

      if (uPos >= 0) {
        for (let j = iStart; j < iEnd; j++) {
          const nbUserPos = cache.itemRowUsers[j];
          if (ku === 0 || userClusters[nbUserPos] === targetUserCluster) {
            cnt++;
            const k = cache.itemRowRatings[j];
            const lOff = (nbUserPos * R + k) * R;
            for (let r = 0; r < R; r++) {
              filt_i[r] = Math.fround(filt_i[r] + L_i_clus[lOff + r]);
            }
          }
        }
      }
    }

    const useClus = cnt > 0;
    const cClus = useClus ? cnt : lens;
    pw_i_clus[q] = Math.fround(1.0 / (1.0 + cClus));

    const qOff = q * R;
    if (useClus) {
      for (let r = 0; r < R; r++) {
        post_i_clus[qOff + r] = Math.fround(prior_i[r] + filt_i[r]);
      }
    } else {
      // Fallback ke NBCF biasa jika tidak ada neighbor di klaster yang sama
      for (let r = 0; r < R; r++) {
        post_i_clus[qOff + r] = post_i_base[qOff + r];
      }
    }
  }

  // 2B. User-Based NBCF + Klaster (indeks neighbor item dikelompokkan per klaster ki)
  const numItemClusters = Math.max(1, ki);
  const clusterNbCounts = new Int32Array(numItemClusters);
  const nbItemClusterList = new Int32Array(numNbItems);

  for (let j = 0; j < numNbItems; j++) {
    const nbItemPos = cache.userRowItems[uStart + j];
    const c = ki > 0 ? itemClusters[nbItemPos] : 0;
    nbItemClusterList[j] = c;
    if (c >= 0 && c < numItemClusters) {
      clusterNbCounts[c]++;
    }
  }

  // Bangun struktur indeks CSR per klaster item c agar kandidat item di klaster c
  // hanya mengevaluasi neighbor item yang berada di klaster c
  const clusUserToNbOffsets: Int32Array[] = new Array(numItemClusters);
  const clusUserToNbLocalIdx: Int32Array[] = new Array(numItemClusters);
  const clusUserToNbSameRating: Uint8Array[] = new Array(numItemClusters);

  for (let c = 0; c < numItemClusters; c++) {
    const cntC = clusterNbCounts[c];
    if (cntC === 0) continue;

    const offsets = new Int32Array(nUsers + 1);
    const tCounts = new Int32Array(nUsers);

    for (let j = 0; j < numNbItems; j++) {
      if (nbItemClusterList[j] !== c) continue;
      const nbItemPos = cache.userRowItems[uStart + j];
      const s = cache.itemRowOffsets[nbItemPos];
      const e = cache.itemRowOffsets[nbItemPos + 1];
      for (let idx = s; idx < e; idx++) {
        tCounts[cache.itemRowUsers[idx]]++;
      }
    }

    for (let u = 0; u < nUsers; u++) {
      offsets[u + 1] = offsets[u] + tCounts[u];
    }

    const tot = offsets[nUsers];
    const localIdxArr = new Int32Array(tot);
    const sameRatArr = new Uint8Array(tot);
    const wCur = Int32Array.from(offsets.subarray(0, nUsers));

    let localJ = 0;
    for (let j = 0; j < numNbItems; j++) {
      if (nbItemClusterList[j] !== c) continue;
      const nbItemPos = cache.userRowItems[uStart + j];
      const k = cache.userRowRatings[uStart + j];
      const s = cache.itemRowOffsets[nbItemPos];
      const e = cache.itemRowOffsets[nbItemPos + 1];
      for (let idx = s; idx < e; idx++) {
        const wUser = cache.itemRowUsers[idx];
        const wRating = cache.itemRowRatings[idx];
        const pos = wCur[wUser]++;
        localIdxArr[pos] = localJ;
        sameRatArr[pos] = wRating === k ? 1 : 0;
      }
      localJ++;
    }

    clusUserToNbOffsets[c] = offsets;
    clusUserToNbLocalIdx[c] = localIdxArr;
    clusUserToNbSameRating[c] = sameRatArr;
  }

  const clusterPosteriors = new Float32Array(nq * R);
  const D_u_clus = new Float32Array(numNbItems * R);
  const T_u_clus = new Float32Array(numNbItems * R);
  const filt_u = new Float32Array(R);

  for (let q = 0; q < nq; q++) {
    const aPos = candItemPos[q];
    const targetItemCluster =
      aPos >= 0 ? (ki > 0 ? itemClusters[aPos] : 0) : -1;
    const cnt =
      targetItemCluster >= 0 && targetItemCluster < numItemClusters
        ? clusterNbCounts[targetItemCluster]
        : 0;
    const useClus = aPos >= 0 && cnt > 0;
    const cClus = useClus ? cnt : numNbItems;
    const pw_u_c = Math.fround(1.0 / (1.0 + cClus));
    const pw_i_c = pw_i_clus[q];
    const qOff = q * R;

    filt_u.fill(0);

    if (useClus) {
      const lenBuf = cnt * R;
      for (let z = 0; z < lenBuf; z++) {
        D_u_clus[z] = 0;
        T_u_clus[z] = 0;
      }

      const cOffsets = clusUserToNbOffsets[targetItemCluster];
      const cLocalIdx = clusUserToNbLocalIdx[targetItemCluster];
      const cSameRat = clusUserToNbSameRating[targetItemCluster];

      const iStart = cache.itemRowOffsets[aPos];
      const iEnd = cache.itemRowOffsets[aPos + 1];
      for (let idx = iStart; idx < iEnd; idx++) {
        const wUser = cache.itemRowUsers[idx];
        const r = cache.itemRowRatings[idx];
        const lStart = cOffsets[wUser];
        const lEnd = cOffsets[wUser + 1];
        for (let l = lStart; l < lEnd; l++) {
          const localJ = cLocalIdx[l];
          const dIdx = localJ * R + r;
          D_u_clus[dIdx] += 1.0;
          if (cSameRat[l] === 1) {
            T_u_clus[dIdx] += 1.0;
          }
        }
      }

      for (let localJ = 0; localJ < cnt; localJ++) {
        const jOff = localJ * R;
        for (let r = 0; r < R; r++) {
          const num = Math.fround(T_u_clus[jOff + r] + ALPHA);
          const den = Math.fround(D_u_clus[jOff + r] + R_ALPHA);
          const lv = Math.fround(Math.log(Math.fround(num / den)));
          filt_u[r] = Math.fround(filt_u[r] + lv);
        }
      }

      for (let r = 0; r < R; r++) {
        const pr_u = cache.itemLogPrior[aPos * R + r];
        const post_u_c = Math.fround(pr_u + filt_u[r]);
        const hybClus = Math.fround(
          Math.fround(pw_i_c * post_i_clus[qOff + r]) +
            Math.fround(pw_u_c * post_u_c)
        );
        clusterPosteriors[qOff + r] = roundFloat16(hybClus);
      }
    } else {
      // Fallback jika kandidat item berada pada klaster yang belum pernah dirating user
      if (aPos >= 0 && numNbItems > 0) {
        D_u_clus.fill(0);
        T_u_clus.fill(0);
        const iStart = cache.itemRowOffsets[aPos];
        const iEnd = cache.itemRowOffsets[aPos + 1];
        for (let idx = iStart; idx < iEnd; idx++) {
          const wUser = cache.itemRowUsers[idx];
          const r = cache.itemRowRatings[idx];
          const lStart = userToNbOffsets[wUser];
          const lEnd = userToNbOffsets[wUser + 1];
          for (let l = lStart; l < lEnd; l++) {
            const j = userToNbIdx[l];
            const dIdx = j * R + r;
            D_u_clus[dIdx] += 1.0;
            if (userToNbSameRating[l] === 1) {
              T_u_clus[dIdx] += 1.0;
            }
          }
        }
        for (let j = 0; j < numNbItems; j++) {
          const jOff = j * R;
          for (let r = 0; r < R; r++) {
            const num = Math.fround(T_u_clus[jOff + r] + ALPHA);
            const den = Math.fround(D_u_clus[jOff + r] + R_ALPHA);
            const lv = Math.fround(Math.log(Math.fround(num / den)));
            filt_u[r] = Math.fround(filt_u[r] + lv);
          }
        }
      }

      for (let r = 0; r < R; r++) {
        const pr_u =
          aPos >= 0 ? cache.itemLogPrior[aPos * R + r] : LOG_UNIFORM_PRIOR;
        const post_u_c = Math.fround(pr_u + filt_u[r]);
        const hybClus = Math.fround(
          Math.fround(pw_i_c * post_i_clus[qOff + r]) +
            Math.fround(pw_u_c * post_u_c)
        );
        clusterPosteriors[qOff + r] = roundFloat16(hybClus);
      }
    }
  }

  const tClusEnd = performance.now();
  const clusterTimeMs = tClusEnd - tClusStart;

  return {
    candidateItems,
    basePosteriors,
    clusterPosteriors,
    baseTimeMs,
    clusterTimeMs,
  };
}
