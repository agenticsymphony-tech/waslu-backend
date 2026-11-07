/**
 * Pure health-check logic, kept separate from the route so it can be unit tested
 * without PostgreSQL or Redis.
 *
 * The response intentionally contains no hostnames, ports, connection strings or
 * driver error text — those can leak infrastructure details and credentials.
 */

export type CheckStatus = "up" | "down"

export interface HealthResponse {
  statusCode: number
  body: {
    status: "ok" | "error"
    checks: {
      application: "up"
      postgres: CheckStatus
      redis: CheckStatus
    }
  }
}

/**
 * The app is healthy only when both dependencies are reachable. If we are
 * answering at all, the application itself is up.
 */
export function evaluateHealth(
  postgresReachable: boolean,
  redisReachable: boolean,
): HealthResponse {
  const healthy = postgresReachable && redisReachable

  return {
    statusCode: healthy ? 200 : 503,
    body: {
      status: healthy ? "ok" : "error",
      checks: {
        application: "up",
        postgres: postgresReachable ? "up" : "down",
        redis: redisReachable ? "up" : "down",
      },
    },
  }
}