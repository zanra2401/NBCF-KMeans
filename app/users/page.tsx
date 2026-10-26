import { container } from "@/di/container";
import { UserListView } from "@/presentation/views/UserListView";

export default async function UsersPage() {
  const [users, totalCount] = await Promise.all([
    container.useCases.getAllUsers.execute({ limit: 100 }),
    container.useCases.getAllUsers.count(),
  ]);

  return <UserListView users={users} totalCount={totalCount} />;
}
