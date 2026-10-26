/**
 * Domain Errors
 * Definisi error spesifik domain agar layer luar dapat menangani kasus error secara terstruktur.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class EntityNotFoundError extends DomainError {
  constructor(entityName: string, id: string) {
    super(`${entityName} dengan ID "${id}" tidak ditemukan.`);
    this.name = "EntityNotFoundError";
  }
}
