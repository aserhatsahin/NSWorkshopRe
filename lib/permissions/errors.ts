import type { Permission } from "./definitions";

export class UnauthenticatedError extends Error {
  constructor() {
    super("Oturum bulunamadı");
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends Error {
  readonly permission: Permission;

  constructor(permission: Permission) {
    super(`Bu işlem için yetkin yok: ${permission}`);
    this.name = "ForbiddenError";
    this.permission = permission;
  }
}
