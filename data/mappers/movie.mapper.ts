import type { MovieEntity } from "@/domain/entities/movie.entity";
import type { MovieSqliteRow } from "../models/movie.model";

export class MovieMapper {
  static toDomain(row: MovieSqliteRow): MovieEntity {
    return {
      id: Number(row.id),
      title: String(row.title),
      link: String(row.link ?? ""),
    };
  }
}
