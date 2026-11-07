import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Unit tests only. They must not need PostgreSQL, Redis or a running server.
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    environment: "node",
    globals: false,
    clearMocks: true,
  },
})