import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["test/**/*.test.ts"],
        // Deterministic, self-contained config: tests never read the developer's .env values for these.
        env: {
            NODE_ENV: "test",
            JWT_SECRET: "test-secret-that-is-at-least-32-characters-long",
            COOKIE_NAME: "iema_session",
            COOKIE_SECURE: "true",
            CORS_ORIGINS: "http://localhost:3000",
            LOGIN_RATE_LIMIT_MAX: "5",
            MYSQL_HOST: "localhost",
            MYSQL_USER: "unused",
            MYSQL_PASSWORD: "unused",
            MYSQL_DATABASE: "unused",
        },
    },
});
