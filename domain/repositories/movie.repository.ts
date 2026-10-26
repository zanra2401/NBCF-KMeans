import type { MovieEntity } from "../entities/movie.entity";

export interface MovieFilterCriteria {
  readonly search?: string;
  readonly limit?: number;
}

/**
 * Domain Repository Contract: IMovieRepository (Read-Only)
 */
export interface IMovieRepository {
  getAll(filter?: MovieFilterCriteria): Promise<readonly MovieEntity[]>;
  getById(id: number): Promise<MovieEntity | null>;
  count(): Promise<number>;
}
