import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { HttpError } from "../errors.js";

export const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");
export const cookieName = "gieci_session";
export function readSessionCookie(req) {
  const value = (req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${cookieName}=`));
  const token = value?.slice(cookieName.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export const cookieOptions = (config) => ({
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: "strict",
  path: "/api",
  maxAge: 8 * 60 * 60 * 1000,
});
export function requireSession(pool) {
  return async (req, res, next) => {
    const token = readSessionCookie(req);
    if (!token) throw new HttpError(401, "Entre na sua conta para continuar.");
    const [[session]] = await pool.execute(
      "SELECT s.*, u.nome, u.email FROM sessoes s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token_hash=? AND s.expira_em>UTC_TIMESTAMP(3) AND u.ativo=1",
      [hashToken(token)],
    );
    if (!session) throw new HttpError(401, "Sessão expirada. Entre novamente.");
    req.session = session;
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const csrf = req.get("X-CSRF-Token") || "";
      if (
        !/^[a-f0-9]{64}$/.test(csrf) ||
        !timingSafeEqual(Buffer.from(csrf), Buffer.from(session.csrf_token))
      )
        throw new HttpError(403, "Sessão inválida. Atualize a página.");
    }
    next();
  };
}
export function requireDevice(pool) {
  return async (req, res, next) => {
    const match = /^Bearer ([\x21-\x7E]{20,72})$/.exec(
      req.get("Authorization") || "",
    );
    if (
      !match ||
      typeof req.body?.esp32_id !== "string" ||
      req.body.esp32_id.length > 80
    )
      throw new HttpError(401, "Dispositivo não autorizado.");
    const [[device]] = await pool.execute(
      "SELECT id,token_hash FROM dispositivos WHERE dispositivo_id=? AND ativo=1",
      [req.body.esp32_id],
    );
    if (!device || !(await bcrypt.compare(match[1], device.token_hash)))
      throw new HttpError(401, "Dispositivo não autorizado.");
    req.deviceId = device.id;
    next();
  };
}
