import { container } from "@/di/container";
import { MovieListView } from "@/presentation/views/MovieListView";

export default async function MoviesPage() {
  const [movies, totalCount] = await Promise.all([
    container.useCases.getAllMovies.execute({ limit: 100 }),
    container.useCases.getAllMovies.count(),
  ]);

  return <MovieListView movies={movies} totalCount={totalCount} />;
}
