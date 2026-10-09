import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

const booleanFromString = z
    .enum(["true", "false"])
    .transform((value) => value === "true");

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_NAME: z.string().min(1).default("iema-crm"),
    PORT: z.coerce.number().int().positive().default(8080),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

    // Comma-separated list of origins allowed to make credentialed requests.
    CORS_ORIGINS: z
        .string()
        .default("http://localhost:3000")
        .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean)),
    // Number of reverse proxies in front of the app (needed for correct client IPs / rate limiting).
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),

    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 3),
    JWT_ISSUER: z.string().min(1).default("iema-crm"),

    COOKIE_NAME: z.string().min(1).default("iema_session"),
    COOKIE_SECURE: booleanFromString.default(true),
    COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),
    COOKIE_DOMAIN: z.string().min(1).optional(),

    BCRYPT_COST: z.coerce.number().int().min(10).max(15).default(12),

    LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

    MYSQL_HOST: z.string().min(1),
    MYSQL_PORT: z.coerce.number().int().positive().default(3306),
    MYSQL_USER: z.string().min(1),
    MYSQL_PASSWORD: z.string(),
    MYSQL_DATABASE: z.string().min(1),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    DB_LOG_QUERIES: booleanFromString.default(false),
}).refine((env) => env.COOKIE_SAME_SITE !== "none" || env.COOKIE_SECURE, {
    message: "COOKIE_SAME_SITE=none requires COOKIE_SECURE=true (browsers reject it otherwise)",
    path: ["COOKIE_SAME_SITE"],
});

export type Env = z.infer<typeof envSchema>;

const parseEnv = (source: NodeJS.ProcessEnv): Env => {
    const result = envSchema.safeParse(source);
    if (!result.success) {
        // Never print values: they may contain secrets.
        const problems = result.error.issues
            .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
            .join("\n");
        throw new Error(`Invalid environment configuration:\n${problems}`);
    }
    return result.data;
};

const env = parseEnv(process.env);

export const config = Object.freeze({
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === "production",
    appName: env.APP_NAME,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    trustProxyHops: env.TRUST_PROXY_HOPS,
    corsOrigins: env.CORS_ORIGINS,

    auth: {
        jwtSecret: env.JWT_SECRET,
        jwtExpiresInSeconds: env.JWT_EXPIRES_IN_SECONDS,
        jwtIssuer: env.JWT_ISSUER,
        bcryptCost: env.BCRYPT_COST,
        loginRateLimit: {
            windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
            max: env.LOGIN_RATE_LIMIT_MAX,
        },
    },

    cookie: {
        name: env.COOKIE_NAME,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAME_SITE,
        domain: env.COOKIE_DOMAIN,
    },

    database: {
        host: env.MYSQL_HOST,
        port: env.MYSQL_PORT,
        username: env.MYSQL_USER,
        password: env.MYSQL_PASSWORD,
        database: env.MYSQL_DATABASE,
        poolMax: env.DB_POOL_MAX,
        logQueries: env.DB_LOG_QUERIES,
    },
});

export type AppConfig = typeof config;
