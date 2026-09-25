import bcrypt from "bcryptjs";
import { z } from "zod";
import { loadConfig } from "../config.js";
import { createPool } from "../db.js";
import { ask } from "./prompt.js";
const pool = createPool(loadConfig());
try {
  const name = z
    .string()
    .trim()
    .min(1)
    .max(120)
    .parse(await ask("Nome: "));
  const email = z
    .email()
    .max(254)
    .parse(await ask("E-mail: "))
    .toLowerCase();
  const password = z
    .string()
    .min(12, "A senha deve ter pelo menos 12 caracteres.")
    .refine((v) => Buffer.byteLength(v) <= 72, "Máximo de 72 bytes.")
    .parse(await ask("Senha (vai aparecer na tela): "));
  if (password !== (await ask("Repita a senha: ")))
    throw new Error("As senhas não coincidem.");
  await pool.execute(
    "INSERT INTO usuarios (nome,email,senha_hash) VALUES (?,?,?)",
    [name, email, await bcrypt.hash(password, 12)],
  );
  console.log("Usuário cadastrado. Abra o painel para entrar.");
} catch (error) {
  console.error(
    error.code === "ER_DUP_ENTRY" ? "E-mail já cadastrado." : error.message,
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
