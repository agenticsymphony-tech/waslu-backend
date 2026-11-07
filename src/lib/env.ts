/**
 * Centralized environment validation.
 *
 * Every environment variable the application reads is declared here. Startup
 * calls `validateEnv()` from `medusa-config.ts`, so a missing or invalid variable
 * stops the app with one readable message instead of failing later somewhere
 * deep in a request.
 *
 * Rules:
 *   - Error messages name the variable, never its value (values may be secrets).
 *   - All problems are collected and reported together, not one per restart.
 *   - Placeholders from `.env.example` are accepted in development but rejected
 *     in production.
 */

/** Variables that must be present and non-empty in every environment. */
const REQUIRED_VARIABLES = [
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_SECRET",
  "COOKIE_SECRET",
  "STORE_CORS",
  "ADMIN_CORS",
  "AUTH_CORS",
] as const

/** Secret values shipped in `.env.example`. Never acceptable in production. */
const PLACEHOLDER_SECRETS = [
  "dev-only-jwt-secret-change-me",
  "dev-only-cookie-secret-change-me",
]

const MIN_SECRET_LENGTH = 32

const NODE_ENVS = ["development", "test", "production"] as const

export type NodeEnv = (typeof NODE_ENVS)[number]

/** Validated configuration. Read this instead of `process.env` in app code. */
export interface Env {
  nodeEnv: NodeEnv
  port: number
  databaseUrl: string
  redisUrl: string
  jwtSecret: string
  cookieSecret: string
  storeCors: string
  adminCors: string
  authCors: string
}

/** Thrown when the environment is not usable. The message is safe to print. */
export class EnvValidationError extends Error {
  constructor(problems: string[]) {
    super(
      `Invalid environment configuration:\n` +
        problems.map((problem) => `  - ${problem}`).join("\n") +
        `\n\nCopy .env.example to .env and fill in the values. ` +
        `See CONTRIBUTING.md section 6.`,
    )
    this.name = "EnvValidationError"
  }
}

function isNonEmpty(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0
}

/**
 * Validate a raw environment and return typed configuration.
 *
 * `source` is injectable so tests can check behaviour without touching the real
 * process environment.
 */
export function validateEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const problems: string[] = []

  for (const name of REQUIRED_VARIABLES) {
    if (!isNonEmpty(source[name])) {
      problems.push(`${name} is required but missing or empty.`)
    }
  }

  const nodeEnv = source.NODE_ENV ?? "development"
  if (!NODE_ENVS.includes(nodeEnv as NodeEnv)) {
    problems.push(
      `NODE_ENV must be one of ${NODE_ENVS.join(", ")}. ` +
        `Set it to "development" if unsure.`,
    )
  }

  const port = Number(source.PORT ?? 9000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    problems.push(`PORT must be a whole number between 1 and 65535.`)
  }

  // Report format problems only when the value exists, so a missing variable
  // produces one clear message rather than two confusing ones.
  if (
    isNonEmpty(source.DATABASE_URL) &&
    !/^postgres(ql)?:\/\//.test(source.DATABASE_URL)
  ) {
    problems.push(
      `DATABASE_URL must start with postgres:// or postgresql://.`,
    )
  }

  if (
    isNonEmpty(source.REDIS_URL) &&
    !/^rediss?:\/\//.test(source.REDIS_URL)
  ) {
    problems.push(`REDIS_URL must start with redis:// or rediss://.`)
  }

  // Development may use the .env.example placeholders so a fresh clone just runs.
  // Production may not, and needs long secrets.
  const isProduction = nodeEnv === "production"
  if (isProduction) {
    for (const name of ["JWT_SECRET", "COOKIE_SECRET"] as const) {
      const value = source[name]
      if (!isNonEmpty(value)) continue

      if (PLACEHOLDER_SECRETS.includes(value)) {
        problems.push(
          `${name} is still the .env.example placeholder. Generate a real secret.`,
        )
      } else if (value.length < MIN_SECRET_LENGTH) {
        problems.push(
          `${name} must be at least ${MIN_SECRET_LENGTH} characters in production.`,
        )
      }
    }
  }

  if (
    isNonEmpty(source.JWT_SECRET) &&
    isNonEmpty(source.COOKIE_SECRET) &&
    source.JWT_SECRET === source.COOKIE_SECRET
  ) {
    problems.push(`JWT_SECRET and COOKIE_SECRET must be different values.`)
  }

  if (problems.length > 0) {
    throw new EnvValidationError(problems)
  }

  return {
    nodeEnv: nodeEnv as NodeEnv,
    port,
    databaseUrl: source.DATABASE_URL as string,
    redisUrl: source.REDIS_URL as string,
    jwtSecret: source.JWT_SECRET as string,
    cookieSecret: source.COOKIE_SECRET as string,
    storeCors: source.STORE_CORS as string,
    adminCors: source.ADMIN_CORS as string,
    authCors: source.AUTH_CORS as string,
  }
}