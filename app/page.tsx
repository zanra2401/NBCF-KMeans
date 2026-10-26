import { container } from "@/di/container";
import { HomeView } from "@/presentation/views/HomeView";

export default async function HomePage() {
  const [totalMovies, totalUsers] = await Promise.all([
    container.useCases.getAllMovies.count(),
    container.useCases.getAllUsers.count(),
  ]);

  return <HomeView totalMovies={totalMovies} totalUsers={totalUsers} />;
}
