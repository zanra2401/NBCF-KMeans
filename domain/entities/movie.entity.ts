/**
 * Domain Entity: MovieEntity
 * Menyimpan data film yang diambil dari u.item (id, nama film / title, dan link IMDb).
 */
export interface MovieEntity {
  readonly id: number;
  readonly title: string;
  readonly link: string;
}
