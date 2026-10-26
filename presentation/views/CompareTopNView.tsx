"use client";

import { useState, useTransition } from "react";
import type { UserTopNComparisonEntity } from "@/domain/entities/recommendation.entity";
import type { EligibleUserSummary } from "@/domain/repositories/recommendation.repository";

interface CompareTopNViewProps {
  readonly initialEligibleUsers: readonly EligibleUserSummary[];
  readonly initialComparison: UserTopNComparisonEntity;
}

export function CompareTopNView({
  initialEligibleUsers,
  initialComparison,
}: CompareTopNViewProps) {
  const [eligibleUsers, setEligibleUsers] =
    useState<readonly EligibleUserSummary[]>(initialEligibleUsers);
  const [comparison, setComparison] =
    useState<UserTopNComparisonEntity>(initialComparison);

  const [fold, setFold] = useState<number>(initialComparison.fold);
  const [userId, setUserId] = useState<number>(initialComparison.user.id);
  const [ku, setKu] = useState<number>(initialComparison.ku);
  const [ki, setKi] = useState<number>(initialComparison.ki);
  const [n, setN] = useState<number>(initialComparison.n);
  const [onlyRelevantGt, setOnlyRelevantGt] = useState<boolean>(true);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function fetchComparison(nextParams: {
    fold: number;
    userId: number;
    ku: number;
    ki: number;
    n: number;
  }) {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const qs = new URLSearchParams({
          fold: String(nextParams.fold),
          user: String(nextParams.userId),
          ku: String(nextParams.ku),
          ki: String(nextParams.ki),
          n: String(nextParams.n),
        });
        const res = await fetch(`/api/compare?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Gagal memuat data perbandingan");
        }
        setEligibleUsers(data.eligibleUsers);
        setComparison(data.comparison);
        setUserId(data.comparison.user.id);
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "Terjadi kesalahan saat memuat"
        );
      }
    });
  }

  const mBase = comparison.nbcf.metrics;
  const mClus = comparison.clusteredNbcf.metrics;

  const displayedGroundTruth = onlyRelevantGt
    ? comparison.groundTruth.filter((g) => g.relevant)
    : comparison.groundTruth;

  const metricRows = [
    {
      label: `Hits@${comparison.n}`,
      base: `${mBase.hits} / ${mBase.totalRelevant}`,
      clus: `${mClus.hits} / ${mClus.totalRelevant}`,
      diff: mClus.hits - mBase.hits,
      isInt: true,
    },
    {
      label: `Precision@${comparison.n}`,
      base: mBase.precision.toFixed(5),
      clus: mClus.precision.toFixed(5),
      diff: mClus.precision - mBase.precision,
    },
    {
      label: `Recall@${comparison.n}`,
      base: mBase.recall.toFixed(5),
      clus: mClus.recall.toFixed(5),
      diff: mClus.recall - mBase.recall,
    },
    {
      label: `F1-Score@${comparison.n}`,
      base: mBase.f1.toFixed(5),
      clus: mClus.f1.toFixed(5),
      diff: mClus.f1 - mBase.f1,
    },
    {
      label: `DCG@${comparison.n}`,
      base: mBase.dcg.toFixed(5),
      clus: mClus.dcg.toFixed(5),
      diff: mClus.dcg - mBase.dcg,
    },
    {
      label: `NDCG@${comparison.n}`,
      base: mBase.ndcg.toFixed(5),
      clus: mClus.ndcg.toFixed(5),
      diff: mClus.ndcg - mBase.ndcg,
    },
  ];

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          Evaluasi Rekomendasi Top-N (TypeScript Engine)
        </span>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Perbandingan NBCF vs NBCF + Klaster vs Ground Truth
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Pilih <strong>Fold</strong> dan <strong>User</strong> untuk melihat
          rekomendasi Top-N serta evaluasi{" "}
          <strong>Precision, Recall, F1-Score, DCG, dan NDCG</strong>.
        </p>
      </div>

      {/* Form Input Fold & User */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Fold */}
          <div>
            <label
              htmlFor="select-fold"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
            >
              Fold (1 - 5)
            </label>
            <select
              id="select-fold"
              value={fold}
              onChange={(e) => {
                const nextFold = Number(e.target.value);
                setFold(nextFold);
                fetchComparison({ fold: nextFold, userId, ku, ki, n });
              }}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
            >
              {[1, 2, 3, 4, 5].map((f) => (
                <option key={f} value={f}>
                  Fold {f} (u{f}.base / u{f}.test)
                </option>
              ))}
            </select>
          </div>

          {/* User */}
          <div className="sm:col-span-2">
            <label
              htmlFor="select-user"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
            >
              Pilih User ({eligibleUsers.length} User Dievaluasi pada Fold{" "}
              {fold})
            </label>
            <select
              id="select-user"
              value={userId}
              onChange={(e) => {
                const nextUser = Number(e.target.value);
                setUserId(nextUser);
                fetchComparison({ fold, userId: nextUser, ku, ki, n });
              }}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
            >
              {eligibleUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  User #{u.id} &bull; {u.age} thn, {u.occupation} ({u.relevantCount}{" "}
                  item relevan)
                </option>
              ))}
            </select>
          </div>

          {/* Top-N */}
          <div>
            <label
              htmlFor="select-n"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
            >
              Jumlah Top-N
            </label>
            <select
              id="select-n"
              value={n}
              onChange={(e) => {
                const nextN = Number(e.target.value);
                setN(nextN);
                fetchComparison({ fold, userId, ku, ki, n: nextN });
              }}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
            >
              {[5, 10, 20].map((val) => (
                <option key={val} value={val}>
                  Top-{val}
                </option>
              ))}
            </select>
          </div>

          {/* Klaster ku, ki */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="select-ku"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
              >
                Klaster ku
              </label>
              <select
                id="select-ku"
                value={ku}
                onChange={(e) => {
                  const nextKu = Number(e.target.value);
                  setKu(nextKu);
                  fetchComparison({ fold, userId, ku: nextKu, ki, n });
                }}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
              >
                {Array.from({ length: 19 }, (_, idx) => idx + 2).map((kVal) => (
                  <option key={kVal} value={kVal}>
                    ku = {kVal}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="select-ki"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
              >
                Klaster ki
              </label>
              <select
                id="select-ki"
                value={ki}
                onChange={(e) => {
                  const nextKi = Number(e.target.value);
                  setKi(nextKi);
                  fetchComparison({ fold, userId, ku, ki: nextKi, n });
                }}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
              >
                {Array.from({ length: 19 }, (_, idx) => idx + 2).map((kVal) => (
                  <option key={kVal} value={kVal}>
                    ki = {kVal}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Status Info Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <div>
            User Terpilih:{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">
              ID #{comparison.user.id}
            </strong>{" "}
            ({comparison.user.age} tahun &bull; {comparison.user.occupation})
            &bull; Ambang Relevan: <strong>Rating &ge; {comparison.threshold}</strong>
          </div>
          {isPending && (
            <span className="font-medium text-blue-600 dark:text-blue-400">
              Menghitung rekomendasi &amp; metrik...
            </span>
          )}
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-300">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Tabel Metrik Evaluasi User */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-bold">
          Metrik Evaluasi User #{comparison.user.id} pada Fold {comparison.fold}{" "}
          (N = {comparison.n})
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Perbandingan nilai Precision, Recall, F1-Score, DCG, dan NDCG antara
          NBCF Biasa vs NBCF + Klaster (ku={comparison.ku}, ki={comparison.ki}).
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Metrik</th>
                <th className="px-4 py-2.5 font-semibold">
                  NBCF Biasa (ku=0, ki=0)
                </th>
                <th className="px-4 py-2.5 font-semibold">
                  NBCF + Klaster (ku={comparison.ku}, ki={comparison.ki})
                </th>
                <th className="px-4 py-2.5 font-semibold">Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {metricRows.map((row) => {
                const isPos = row.diff > 1e-9;
                const isNeg = row.diff < -1e-9;
                return (
                  <tr key={row.label}>
                    <td className="px-4 py-2.5 font-medium">{row.label}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {row.base}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold">
                      {row.clus}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      <span
                        className={
                          isPos
                            ? "font-semibold text-emerald-600 dark:text-emerald-400"
                            : isNeg
                              ? "text-red-600 dark:text-red-400"
                              : "text-zinc-400"
                        }
                      >
                        {isPos ? "+" : ""}
                        {row.isInt ? row.diff : row.diff.toFixed(5)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3 List Berdampingan: NBCF Biasa vs NBCF + Klaster vs Ground Truth */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 1. List Top-N NBCF Biasa */}
        <div className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-3.5 dark:border-zinc-800">
            <h3 className="text-sm font-bold">
              1. Top-{comparison.n} NBCF Biasa
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Urutan rating prediksi (tanpa klaster)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
                <tr>
                  <th className="px-3 py-2 font-semibold">#</th>
                  <th className="px-3 py-2 font-semibold">Nama Film (ID)</th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Prediksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {comparison.nbcf.items.map((item) => (
                  <tr
                    key={item.itemId}
                    className={
                      item.relevant
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30"
                        : ""
                    }
                  >
                    <td className="px-3 py-2.5 font-mono text-zinc-500">
                      {item.rank}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[11px] text-zinc-400">
                        [{item.itemId}]
                      </span>{" "}
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </span>
                      {item.relevant && (
                        <span className="ml-1.5 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          Hit (Uji: {item.testRating})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold">
                      {item.pred}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. List Top-N NBCF + Klaster */}
        <div className="flex flex-col rounded-xl border border-blue-200 bg-white shadow-xs dark:border-blue-900/60 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-3.5 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400">
              2. Top-{comparison.n} NBCF + Klaster ({comparison.ku},{" "}
              {comparison.ki})
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Urutan rating prediksi dengan klaster K-Means
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
                <tr>
                  <th className="px-3 py-2 font-semibold">#</th>
                  <th className="px-3 py-2 font-semibold">Nama Film (ID)</th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Prediksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {comparison.clusteredNbcf.items.map((item) => (
                  <tr
                    key={item.itemId}
                    className={
                      item.relevant
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30"
                        : ""
                    }
                  >
                    <td className="px-3 py-2.5 font-mono text-zinc-500">
                      {item.rank}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[11px] text-zinc-400">
                        [{item.itemId}]
                      </span>{" "}
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </span>
                      {item.relevant && (
                        <span className="ml-1.5 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          Hit (Uji: {item.testRating})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold">
                      {item.pred}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. List Ground Truth */}
        <div className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3.5 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-bold">
                3. Ground Truth (Rating Asli)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Data uji User #{comparison.user.id} ({displayedGroundTruth.length}{" "}
                film)
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={onlyRelevantGt}
                onChange={(e) => setOnlyRelevantGt(e.target.checked)}
                className="rounded border-zinc-300"
              />
              Hanya Relevan (&ge;{comparison.threshold})
            </label>
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 border-b border-zinc-200 bg-zinc-50 uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
                <tr>
                  <th className="px-3 py-2 font-semibold">#</th>
                  <th className="px-3 py-2 font-semibold">Nama Film (ID)</th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Rating Asli
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {displayedGroundTruth.map((item, idx) => (
                  <tr
                    key={item.itemId}
                    className={
                      item.relevant
                        ? "bg-emerald-50/40 dark:bg-emerald-950/20"
                        : ""
                    }
                  >
                    <td className="px-3 py-2.5 font-mono text-zinc-500">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[11px] text-zinc-400">
                        [{item.itemId}]
                      </span>{" "}
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold">
                      <span
                        className={
                          item.relevant
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-zinc-500"
                        }
                      >
                        {item.rating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
