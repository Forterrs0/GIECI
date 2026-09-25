import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const notFound = () =>
  new HttpError(404, "Registro não encontrado.");

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof ZodError)
    return res.status(400).json({
      error: "Dados inválidos.",
      details: error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });

  if (error instanceof HttpError)
    return res.status(error.status).json({
      error: error.message,
    });

  if (error.type === "entity.parse.failed")
    return res.status(400).json({
      error: "JSON inválido.",
    });

  if (error.type === "entity.too.large")
    return res.status(413).json({
      error: "Requisição muito grande.",
    });

  if (error.code === "ER_DUP_ENTRY")
    return res.status(409).json({
      error: "Já existe um registro com esse nome ou código.",
    });

  if (
    ["ER_ROW_IS_REFERENCED_2", "ER_NO_REFERENCED_ROW_2"].includes(error.code)
  )
    return res.status(409).json({
      error: "Verifique os registros vinculados antes de continuar.",
    });

  if (
    ["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"].includes(error.code)
  )
    return res.status(409).json({
      error: "Outro processo alterou o estoque. Atualize e tente novamente.",
    });

  console.error("====================================");
  console.error("ERRO INTERNO DA API");
  console.error("Código:", error.code);
  console.error("Mensagem:", error.message);
  console.error("SQL:", error.sql);
  console.error("Detalhes:", error);
  console.error("====================================");

  return res.status(503).json({
    error: error.message,
    code: error.code,
  });
}