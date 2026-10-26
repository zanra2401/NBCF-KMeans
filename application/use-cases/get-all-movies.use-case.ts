import type { MovieEntity } from "@/domain/entities/movie.entity";
import type {
  IMovieRepository,
  MovieFilterCriteria,
} from "@/domain/repositories/movie.repository";

export class GetAllMoviesUseCase {
  constructor(private readonly movieRepository: IMovieRepository) {}

  async execute(filter?: MovieFilterCriteria): Promise<readonly MovieEntity[]> {
    return this.movieRepository.getAll(filter);
  }

  async count(): Promise<number> {
    return this.movieRepository.count();
  }
}
