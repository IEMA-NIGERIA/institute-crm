import type { ErrorRequestHandler, RequestHandler } from "express";
import { z } from "zod";
import { AppError, NotFoundError, ValidationError } from "../errors/app-error";

/** Parse untrusted input against a schema, mapping failures to a 400. */
export const parseInput = <T extends z.ZodType>(schema: T, input: unknown): z.infer<T> => {
    const result = schema.safeParse(input);
    if (!result.success) {
        throw new ValidationError(
            result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
        );
    }
    return result.data;
};

export const notFoundHandler: RequestHandler = (req) => {
    throw new NotFoundError(`route ${req.method} ${req.path}`);
};

interface HttpError extends Error {
    status?: number;
    statusCode?: number;
    expose?: boolean;
    type?: string;
}

/**
 * Single place where errors become HTTP responses. Response shape:
 *   { message, code, details?, requestId }
 * Internal errors are logged with full detail but never leaked to clients.
 */
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const requestId = String(req.id ?? "");

    if (err instanceof AppError) {
        if (err.statusCode >= 500) {
            req.log.error({ err }, "request failed");
        }
        res.status(err.statusCode).json({
            ...err.extra,
            message: err.message,
            code: err.code,
            ...(err.details === undefined ? {} : { details: err.details }),
            requestId,
        });
        return;
    }

    // Errors raised by body-parser and friends (malformed JSON, payload too large, ...).
    const httpErr = err as HttpError;
    const status = httpErr?.status ?? httpErr?.statusCode;
    if (typeof status === "number" && status >= 400 && status < 500 && httpErr.expose !== false) {
        res.status(status).json({
            message: httpErr.type === "entity.parse.failed" ? "malformed JSON body" : httpErr.message,
            code: "BAD_REQUEST",
            requestId,
        });
        return;
    }

    req.log.error({ err }, "unhandled error");
    res.status(500).json({ message: "internal server error", code: "INTERNAL_ERROR", requestId });
};
