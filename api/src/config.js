import { readFileSync } from "node:fs";

export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === "production";
  if (production && (!env.DB_USER || !env.DB_PASSWORD))
    throw new Error("Defina DB_USER e DB_PASSWORD em produção.");
  const cookieSecure = production || env.COOKIE_SECURE === "true";
  const dbName = env.DB_NAME || "gieci";
  if (!/^[a-zA-Z0-9_]{1,64}$/.test(dbName))
    throw new Error("DB_NAME inválido.");
  const origins = (
    env.ALLOWED_ORIGINS ||
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const origin of origins) {
    if (new URL(origin).origin !== origin || !/^https?:/.test(origin))
      throw new Error(
        "ALLOWED_ORIGINS deve conter origens completas, sem caminhos.",
      );
    if (production && !origin.startsWith("https://"))
      throw new Error("Em produção, configure ALLOWED_ORIGINS com HTTPS.");
  }
  const port = Number(env.PORT || 8000);
  const dbPort = Number(env.DB_PORT || 3306);
  if (![port, dbPort].every((p) => Number.isInteger(p) && p > 0 && p <= 65535))
    throw new Error("Porta inválida.");
  return {
    production,
    cookieSecure,
    origins,
    port,
    host: env.HOST || "0.0.0.0",
    trustProxy: env.TRUST_PROXY || false,
    db: {
      host: env.DB_HOST || "127.0.0.1",
      port: dbPort,
      database: dbName,
      user: env.DB_USER || "gieci_app",
      password: env.DB_PASSWORD || "",
      ...(env.DB_SSL_CA
        ? {
            ssl: {
              ca: readFileSync(env.DB_SSL_CA, "utf8"),
              rejectUnauthorized: true,
            },
          }
        : {}),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 100,
      timezone: "Z",
      decimalNumbers: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
      multipleStatements: false,
      charset: "utf8mb4",
      connectTimeout: 10000,
    },
  };
}
