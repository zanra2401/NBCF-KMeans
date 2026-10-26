import { CompareUserTopNUseCase } from "@/application/use-cases/compare-user-topn.use-case";
import { GetAllItemsUseCase } from "@/application/use-cases/get-all-items.use-case";
import { GetAllMoviesUseCase } from "@/application/use-cases/get-all-movies.use-case";
import { GetAllUsersUseCase } from "@/application/use-cases/get-all-users.use-case";
import { GetItemByIdUseCase } from "@/application/use-cases/get-item-by-id.use-case";
import { ItemStaticDataSourceImpl } from "@/data/datasources/item-static.datasource";
import { MovieSqliteDataSourceImpl } from "@/data/datasources/movie-sqlite.datasource";
import { UserSqliteDataSourceImpl } from "@/data/datasources/user-sqlite.datasource";
import { ItemRepositoryImpl } from "@/data/repositories/item.repository.impl";
import { MovieRepositoryImpl } from "@/data/repositories/movie.repository.impl";
import { RecommendationRepositoryImpl } from "@/data/repositories/recommendation.repository.impl";
import { UserRepositoryImpl } from "@/data/repositories/user.repository.impl";

/**
 * Dependency Injection Container (Composition Root)
 * Menghubungkan Data Layer (SQLite & NBCF Engine) -> Repository -> Application Use Cases
 */
const itemStaticDataSource = new ItemStaticDataSourceImpl();
const itemRepository = new ItemRepositoryImpl(itemStaticDataSource);

const movieSqliteDataSource = new MovieSqliteDataSourceImpl();
const movieRepository = new MovieRepositoryImpl(movieSqliteDataSource);

const userSqliteDataSource = new UserSqliteDataSourceImpl();
const userRepository = new UserRepositoryImpl(userSqliteDataSource);

const recommendationRepository = new RecommendationRepositoryImpl();

export const container = {
  useCases: {
    getAllItems: new GetAllItemsUseCase(itemRepository),
    getItemById: new GetItemByIdUseCase(itemRepository),
    getAllMovies: new GetAllMoviesUseCase(movieRepository),
    getAllUsers: new GetAllUsersUseCase(userRepository),
    compareUserTopN: new CompareUserTopNUseCase(recommendationRepository),
  },
} as const;
