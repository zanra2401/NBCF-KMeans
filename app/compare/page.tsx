import { container } from "@/di/container";
import { CompareTopNView } from "@/presentation/views/CompareTopNView";

export default async function ComparePage() {
  const defaultFold = 1;
  const eligibleUsers =
    await container.useCases.compareUserTopN.getEligibleUsers(defaultFold, 4);
  const defaultUser = eligibleUsers.some((u) => u.id === 339)
    ? 10
    : (eligibleUsers[0]?.id ?? 1);

  const initialComparison = await container.useCases.compareUserTopN.execute({
    fold: defaultFold,
    userId: defaultUser,
    ku: 17,
    ki: 8,
    n: 10,
    threshold: 4,
  });

  return (
    <CompareTopNView
      initialEligibleUsers={eligibleUsers}
      initialComparison={initialComparison}
    />
  );
}
