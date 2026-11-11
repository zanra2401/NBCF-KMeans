"use client";

import { useState, useTransition } from "react";
import {
  FIXED_FOLD,
  FIXED_KI,
  FIXED_KU,
  SUPPORTED_TOP_N_VALUES,
} from "@/config/topn-best-params";
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

  const [userId, setUserId] = useState<number>(initialComparison.user.id);
  const [n, setN] = useState<number>(initialComparison.n);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function fetchComparison(nextParams: {
    userId: number;
    n: number;
  }) {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const qs = new URLSearchParams({
          fold: String(FIXED_FOLD),
          user: String(nextParams.userId),
          ku: String(FIXED_KU),
          ki: String(FIXED_KI),
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

  const displayedGroundTruth = comparison.groundTruth;

  const timeDiffMs = mClus.executionTimeMs - mBase.executionTimeMs;
  const speedupRatio =
    mClus.executionTimeMs > 0
      ? mBase.executionTimeMs / mClus.executionTimeMs
      : 1;

  const metricRows = [
    {
      label: `Hits@${comparison.n}`,
      base: `${mBase.hits} / ${mBase.totalRelevant}`,
      clus: `${mClus.hits} / ${mClus.totalRelevant}`,
      diff: mClus.hits - mBase.hits,
      isInt: true,
    },
    {
      label: `NDCG@${comparison.n}`,
      base: mBase.ndcg.toFixed(5),
      clus: mClus.ndcg.toFixed(5),
      diff: mClus.ndcg - mBase.ndcg,
    },
  ];

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          Evaluasi Rekomendasi Top-N (TypeScript Engine)
        </span>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Perbandingan NBCF vs NBCF + Klaster vs Ground Truth
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Evaluasi rekomendasi film dengan parameter klaster permanen{" "}
          <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
            ku={FIXED_KU}, ki={FIXED_KI}
          </span>{" "}
          pada{" "}
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            Fold {FIXED_FOLD}
          </span>
          .
        </p>
      </div>

      {/* Form Input User & Top-N */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* User */}
          <div>
            <label
              htmlFor="select-user"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
            >
              Pilih User ({eligibleUsers.length} User Tersedia)
            </label>
            <select
              id="select-user"
              value={userId}
              onChange={(e) => {
                const nextUser = Number(e.target.value);
                setUserId(nextUser);
                fetchComparison({ userId: nextUser, n });
              }}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
            >
              {eligibleUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  User ID: {u.id}
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
                fetchComparison({
                  userId,
                  n: nextN,
                });
              }}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
            >
              {SUPPORTED_TOP_N_VALUES.map((val) => (
                <option key={val} value={val}>
                  Top-{val}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Info Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              User Terpilih:{" "}
              <strong className="text-zinc-900 dark:text-zinc-100">
                User ID: {comparison.user.id}
              </strong>
            </span>
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              Fold: {FIXED_FOLD} &bull; ku={FIXED_KU}, ki={FIXED_KI}
            </span>
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

      {/* 3 List Berdampingan: NBCF Biasa vs NBCF + Klaster vs Ground Truth */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 1. List Top-N NBCF Biasa */}
        <div className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3.5 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-bold">
                1. Top-{comparison.n} NBCF Biasa
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Urutan rating prediksi (tanpa klaster)
              </p>
            </div>
            <span className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {mBase.executionTimeMs.toFixed(2)} ms
            </span>
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
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3.5 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400">
                2. Top-{comparison.n} NBCF + Klaster ({comparison.ku},{" "}
                {comparison.ki})
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Urutan rating prediksi dengan klaster K-Means
              </p>
            </div>
            <span className="rounded-md bg-blue-50 px-2 py-1 font-mono text-[11px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              {mClus.executionTimeMs.toFixed(2)} ms
            </span>
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
                Semua data uji ({displayedGroundTruth.length} film) &bull; rating tertinggi
              </p>
            </div>
            <span className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {displayedGroundTruth.length} Film
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
                <tr>
                  <th className="px-3 py-2 font-semibold">#</th>
                  <th className="px-3 py-2 font-semibold">Nama Film (ID)</th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Rating Asli
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {displayedGroundTruth.map((item) => (
                  <tr
                    key={item.itemId}
                    className={
                      item.relevant
                        ? "bg-emerald-50/40 dark:bg-emerald-950/20"
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

      {/* Tabel Metrik Evaluasi User (Diletakkan di Bawah Informasi List Top-N) */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-bold">
          Metrik Evaluasi User #{comparison.user.id} pada Fold {comparison.fold}{" "}
          (N = {comparison.n})
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Perbandingan nilai <strong>Hits, NDCG, dan Waktu Komputasi</strong>{" "}
          antara NBCF Biasa vs NBCF + Klaster (ku={comparison.ku}, ki=
          {comparison.ki}).
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

              {/* Baris Metrik Waktu Komputasi */}
              <tr className="bg-zinc-50/60 dark:bg-zinc-950/40">
                <td className="px-4 py-2.5 font-medium">
                  Waktu Komputasi (ms)
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  {mBase.executionTimeMs.toFixed(2)} ms
                </td>
                <td className="px-4 py-2.5 font-mono text-xs font-semibold">
                  {mClus.executionTimeMs.toFixed(2)} ms
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  <span
                    className={
                      timeDiffMs < -1e-6
                        ? "font-semibold text-emerald-600 dark:text-emerald-400"
                        : timeDiffMs > 1e-6
                          ? "text-red-600 dark:text-red-400"
                          : "text-zinc-400"
                    }
                  >
                    {timeDiffMs > 0 ? "+" : ""}
                    {timeDiffMs.toFixed(2)} ms
                    {speedupRatio > 1.01 && (
                      <span className="ml-1.5 inline-block rounded bg-emerald-100 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                        {speedupRatio.toFixed(2)}x lebih cepat
                      </span>
                    )}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
