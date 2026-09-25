import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import { loadConfig } from "../config.js";
const { db } = loadConfig();
const { database, ...options } = db;
let conn;
try {
  conn = await mysql.createConnection(options);
  const [tables] = await conn.execute(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=?",
    [database],
  );
  if (tables.length) {
    const hasVersion = tables.some((t) => t.TABLE_NAME === "schema_migrations");
    if (!hasVersion)
      throw new Error(
        "Banco já contém tabelas sem versão GIECI. Compare o schema existente antes de migrar. Nenhuma alteração aplicada.",
      );
    const [version] = await conn.query(
      `SELECT version FROM \`${database}\`.schema_migrations WHERE version='gieci-2.0'`,
    );
    if (!version.length)
      throw new Error(
        "Versão do schema não reconhecida. Nenhuma alteração aplicada.",
      );
    console.log("Schema GIECI 2.0 já instalado. Nenhum dado alterado.");
  } else {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await conn.changeUser({ database });
    const sql = await readFile(
      new URL("../../../database/schema.sql", import.meta.url),
      "utf8",
    );
    for (const statement of sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await conn.query(statement);
    console.log(
      "Schema criado. Cadastre o primeiro usuário com npm run user:create.",
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await conn?.end();
}
