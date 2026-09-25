import { loadConfig } from "./config.js";
import { createPool } from "./db.js";
import { createApp } from "./app.js";

const config = loadConfig(),
  pool = createPool(config);
try {
  await pool
    .query("SELECT version FROM schema_migrations WHERE version=?", [
      "gieci-2.0",
    ])
    .then(([rows]) => {
      if (!rows.length) throw new Error("Schema GIECI não instalado.");
    });
  const app = createApp({ pool, config });
  const server = app.listen(config.port, config.host, () =>
    console.log(`GIECI iniciado na porta ${config.port}.`),
  );
  server.on("error", (error) => {
    console.error("Não foi possível abrir a porta:", error.code);
    pool.end().finally(() => process.exit(1));
  });
  const shutdown = () =>
    server.close(() => pool.end().finally(() => process.exit(0)));
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
} catch (error) {
  console.error(
    "Falha ao iniciar. Confira api/.env e execute npm run db:init em um banco novo.",
    error.code || error.message,
  );
  await pool.end();
  process.exitCode = 1;
}
