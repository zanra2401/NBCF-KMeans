import { NextRequest, NextResponse } from "next/server";
import { FIXED_FOLD, FIXED_KI, FIXED_KU } from "@/config/topn-best-params";
import { container } from "@/di/container";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const fold =
      Number.parseInt(searchParams.get("fold") ?? String(FIXED_FOLD), 10) ||
      FIXED_FOLD;
    const n = Number.parseInt(searchParams.get("n") ?? "10", 10) || 10;
    const ku =
      Number.parseInt(searchParams.get("ku") ?? String(FIXED_KU), 10) ||
      FIXED_KU;
    const ki =
      Number.parseInt(searchParams.get("ki") ?? String(FIXED_KI), 10) ||
      FIXED_KI;
    const threshold =
      Number.parseInt(searchParams.get("thr") ?? "4", 10) || 4;

    const eligibleUsers =
      await container.useCases.compareUserTopN.getEligibleUsers(
        fold,
        threshold
      );

    let userId = Number.parseInt(searchParams.get("user") ?? "", 10);
    if (
      Number.isNaN(userId) ||
      !eligibleUsers.some((u) => u.id === userId)
    ) {
      userId = eligibleUsers[0]?.id ?? 1;
    }

    const comparison = await container.useCases.compareUserTopN.execute({
      fold,
      userId,
      ku,
      ki,
      n,
      threshold,
    });

    return NextResponse.json({
      eligibleUsers,
      comparison,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
