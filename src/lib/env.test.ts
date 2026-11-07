import { describe, expect, it } from "vitest"
import { EnvValidationError, validateEnv } from "./env"

/** A complete, valid development environment. Tests vary one field at a time. */
function validEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "development",
    PORT: "9000",
    DATABASE_URL: "postgres://waslu:waslu_dev_only@localhost:5432/waslu",
    REDIS_URL: "redis://localhost:6379",
    JWT_SECRET: "dev-only-jwt-secret-change-me",
    COOKIE_SECRET: "dev-only-cookie-secret-change-me",
    STORE_CORS: "http://localhost:8000",
    ADMIN_CORS: "http://localhost:9000",
    AUTH_CORS: "http://localhost:8000,http://localhost:9000",
    ...overrides,
  }
}

describe("validateEnv", () => {
  it("accepts a complete development environment", () => {
    const env = validateEnv(validEnv())

    expect(env.nodeEnv).toBe("development")
    expect(env.port).toBe(9000)
    expect(env.databaseUrl).toBe(
      "postgres://waslu:waslu_dev_only@localhost:5432/waslu",
    )
  })

  it("defaults NODE_ENV to development and PORT to 9000", () => {
    const source = validEnv()
    delete source.NODE_ENV
    delete source.PORT

    const env = validateEnv(source)

    expect(env.nodeEnv).toBe("development")
    expect(env.port).toBe(9000)
  })

  it("accepts the .env.example placeholder secrets in development", () => {
    expect(() => validateEnv(validEnv())).not.toThrow()
  })

  const required = [
    "DATABASE_URL",
    "REDIS_URL",
    "JWT_SECRET",
    "COOKIE_SECRET",
    "STORE_CORS",
    "ADMIN_CORS",
    "AUTH_CORS",
  ]

  for (const name of required) {
    it(`rejects a missing ${name} and names it in the error`, () => {
      const source = validEnv()
      delete source[name]

      expect(() => validateEnv(source)).toThrow(EnvValidationError)
      expect(() => validateEnv(source)).toThrow(name)
    })

    it(`rejects a whitespace-only ${name}`, () => {
      expect(() => validateEnv(validEnv({ [name]: "   " }))).toThrow(name)
    })
  }

  it("reports every missing variable at once", () => {
    const source = validEnv()
    delete source.DATABASE_URL
    delete source.REDIS_URL
    delete source.JWT_SECRET

    try {
      validateEnv(source)
      expect.unreachable("should have thrown")
    } catch (error) {
      const message = (error as Error).message
      expect(message).toContain("DATABASE_URL")
      expect(message).toContain("REDIS_URL")
      expect(message).toContain("JWT_SECRET")
    }
  })

  it("never prints secret values in the error message", () => {
    const secret = "a-real-secret-that-must-not-leak"
    const source = validEnv({ JWT_SECRET: secret })
    delete source.REDIS_URL

    try {
      validateEnv(source)
      expect.unreachable("should have thrown")
    } catch (error) {
      expect((error as Error).message).not.toContain(secret)
    }
  })

  it("rejects an unknown NODE_ENV", () => {
    expect(() => validateEnv(validEnv({ NODE_ENV: "staging" }))).toThrow(
      "NODE_ENV",
    )
  })

  it("accepts NODE_ENV=test", () => {
    expect(validateEnv(validEnv({ NODE_ENV: "test" })).nodeEnv).toBe("test")
  })

  const badPorts = ["0", "-1", "65536", "not-a-number", "9000.5"]
  for (const port of badPorts) {
    it(`rejects PORT=${JSON.stringify(port)}`, () => {
      expect(() => validateEnv(validEnv({ PORT: port }))).toThrow("PORT")
    })
  }

  it("falls back to port 9000 when PORT is empty", () => {
    expect(validateEnv(validEnv({ PORT: "" })).port).toBe(9000)
  })

  it("rejects a DATABASE_URL with the wrong protocol", () => {
    expect(() =>
      validateEnv(validEnv({ DATABASE_URL: "mysql://localhost/waslu" })),
    ).toThrow("DATABASE_URL")
  })

  it("accepts the postgresql:// alias", () => {
    expect(() =>
      validateEnv(
        validEnv({ DATABASE_URL: "postgresql://waslu:pw@localhost:5432/waslu" }),
      ),
    ).not.toThrow()
  })

  it("rejects a REDIS_URL with the wrong protocol", () => {
    expect(() =>
      validateEnv(validEnv({ REDIS_URL: "http://localhost:6379" })),
    ).toThrow("REDIS_URL")
  })

  it("accepts rediss://", () => {
    expect(() =>
      validateEnv(validEnv({ REDIS_URL: "rediss://localhost:6379" })),
    ).not.toThrow()
  })

  it("rejects identical JWT_SECRET and COOKIE_SECRET", () => {
    expect(() =>
      validateEnv(
        validEnv({ JWT_SECRET: "same-value", COOKIE_SECRET: "same-value" }),
      ),
    ).toThrow("must be different")
  })
})

describe("validateEnv in production", () => {
  const longSecret = "x".repeat(40)

  function productionEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
    return validEnv({
      NODE_ENV: "production",
      JWT_SECRET: longSecret,
      COOKIE_SECRET: "y".repeat(40),
      ...overrides,
    })
  }

  it("accepts long, distinct, non-placeholder secrets", () => {
    expect(validateEnv(productionEnv()).nodeEnv).toBe("production")
  })

  it("rejects the .env.example placeholder JWT_SECRET", () => {
    expect(() =>
      validateEnv(
        productionEnv({ JWT_SECRET: "dev-only-jwt-secret-change-me" }),
      ),
    ).toThrow("placeholder")
  })

  it("rejects the .env.example placeholder COOKIE_SECRET", () => {
    expect(() =>
      validateEnv(
        productionEnv({ COOKIE_SECRET: "dev-only-cookie-secret-change-me" }),
      ),
    ).toThrow("placeholder")
  })

  it("rejects a secret shorter than 32 characters", () => {
    expect(() =>
      validateEnv(productionEnv({ JWT_SECRET: "too-short" })),
    ).toThrow("at least 32 characters")
  })
})