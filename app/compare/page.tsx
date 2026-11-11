import { FIXED_FOLD, FIXED_KI, FIXED_KU } from "@/config/topn-best-params";
import { container } from "@/di/container";
import { CompareTopNView } from "@/presentation/views/CompareTopNView";

export default async function ComparePage() {
  const defaultFold = FIXED_FOLD;
  const defaultN = 10;

  const eligibleUsers =
    await container.useCases.compareUserTopN.getEligibleUsers(defaultFold, 4);
  const defaultUser = eligibleUsers[0]?.id ?? 1;

  const initialComparison = await container.useCases.compareUserTopN.execute({
    fold: defaultFold,
    userId: defaultUser,
    ku: FIXED_KU,
    ki: FIXED_KI,
    n: defaultN,
    threshold: 4,
  });

  return (
    <CompareTopNView
      initialEligibleUsers={eligibleUsers}
      initialComparison={initialComparison}
    />
  );
}
