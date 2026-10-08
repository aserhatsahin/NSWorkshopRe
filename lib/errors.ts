// Kullanıcıya olduğu gibi gösterilebilecek iş kuralı hataları.
// Mesaj Türkçe ve son kullanıcıya yöneliktir.
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
