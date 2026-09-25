import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { loadConfig } from "../config.js";
import { createPool, transaction } from "../db.js";
import { id } from "../validation.js";
import { ask } from "./prompt.js";
const pool = createPool(loadConfig());
try {
  const key = z
    .string()
    .min(1)
    .max(80)
    .regex(/^[\w.-]+$/);
  const device = key.parse(
    await ask("Identificação do ESP32 (ex.: ESP32_001): "),
  );
  const balance = key.parse(
    await ask("Identificação da balança (ex.: BAL001): "),
  );
  const productId = id.parse(await ask("ID do produto cadastrado no painel: "));
  const token = randomBytes(32).toString("hex"),
    hash = await bcrypt.hash(token, 12);
  await transaction(pool, async (conn) => {
    const [[product]] = await conn.execute(
      "SELECT id FROM produtos WHERE id=? AND ativo=1 FOR UPDATE",
      [productId],
    );
    if (!product) throw new Error("Produto não encontrado.");
    const [result] = await conn.execute(
      "INSERT INTO dispositivos (dispositivo_id,token_hash) VALUES (?,?)",
      [device, hash],
    );
    await conn.execute(
      "INSERT INTO balancas (identificacao,dispositivo_id,produto_id) VALUES (?,?,?)",
      [balance, result.insertId, productId],
    );
  });
  console.log(
    "Dispositivo criado. Guarde o token abaixo no firmware; ele não será exibido novamente.\n" +
      token,
  );
} catch (error) {
  console.error(
    error.code === "ER_DUP_ENTRY"
      ? "Dispositivo, balança ou produto já vinculado. Nenhum token foi alterado."
      : error.message,
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
