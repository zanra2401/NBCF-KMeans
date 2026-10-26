import type { MovieEntity } from "@/domain/entities/movie.entity";
import type {
  IMovieRepository,
  MovieFilterCriteria,
} from "@/domain/repositories/movie.repository";
import type { IMovieSqliteDataSource } from "../datasources/movie-sqlite.datasource";
import { MovieMapper } from "../mappers/movie.mapper";

export class MovieRepositoryImpl implements IMovieRepository {
  constructor(private readonly dataSource: IMovieSqliteDataSource) {}

  async getAll(filter?: MovieFilterCriteria): Promise<readonly MovieEntity[]> {
    const rows = await this.dataSource.findAll(filter?.search, filter?.limit);
    return rows.map(MovieMapper.toDomain);
  }

  async getById(id: number): Promise<MovieEntity | null> {
    const row = await this.dataSource.findById(id);
    return row ? MovieMapper.toDomain(row) : null;
  }

  async count(): Promise<number> {
    return this.dataSource.countAll();
  }
}
