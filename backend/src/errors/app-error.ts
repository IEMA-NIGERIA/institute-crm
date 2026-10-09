/**
 * Base class for errors that are safe to expose to API clients.
 * Anything that is not an AppError is treated as an internal error and
 * surfaced to clients as a generic 500.
 */
export class AppError extends Error {
    constructor(
        readonly statusCode: number,
        readonly code: string,
        message: string,
        readonly details?: unknown,
        /** Extra top-level fields for the response body (e.g. `existingId`). */
        readonly extra?: Record<string, unknown>,
    ) {
        super(message);
        this.name = new.target.name;
    }
}

export class ValidationError extends AppError {
    constructor(details: unknown, message = "request validation failed") {
        super(400, "VALIDATION_ERROR", message, details);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "unauthorised request") {
        super(401, "UNAUTHORIZED", message);
    }
}

export class InvalidCredentialsError extends AppError {
    constructor() {
        super(401, "INVALID_CREDENTIALS", "invalid email or password");
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "you do not have permission to perform this action") {
        super(403, "FORBIDDEN", message);
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(404, "NOT_FOUND", `${resource} not found`);
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(409, "CONFLICT", message);
    }
}

/** A record that must be unique already exists; `existingId` lets clients link to it. */
export class DuplicateResourceError extends AppError {
    constructor(resource: string, existingId: string, field: string, fieldLabel = field) {
        super(
            409,
            "DUPLICATE",
            `${resource} with this ${fieldLabel} already exists`,
            [{ path: field, message: `an existing ${resource.toLowerCase()} already uses this ${fieldLabel}` }],
            { existingId },
        );
    }
}
