/**
 * Domain Entity: UserEntity
 * Menyimpan data pengguna yang diambil dari u.user (id, umur / age, dan occupation).
 */
export interface UserEntity {
  readonly id: number;
  readonly age: number;
  readonly occupation: string;
}
