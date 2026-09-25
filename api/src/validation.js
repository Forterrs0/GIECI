import { z } from "zod";
import { HttpError } from "./errors.js";

export const MAX_WEIGHT = 1_000_000_000;
const precision = (n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 0.001;
export const weight = z
  .number()
  .finite()
  .min(0)
  .max(MAX_WEIGHT)
  .refine(precision, "Use no máximo 3 casas decimais.");
export const name = z.string().trim().min(1).max(120);
export const id = z
  .string()
  .regex(/^[1-9]\d{0,9}$/)
  .refine((v) => Number(v) <= 4294967295);
export const armarioInput = z.strictObject({ name });
export const prateleiraInput = z.strictObject({
  name,
  armarioId: id.nullable(),
});
export const productInput = z
  .strictObject({
    name: z.string().trim().min(1).max(160),
    category: z.string().trim().min(1).max(80),
    prateleiraId: id,
    unitWeight: weight.refine((n) => n > 0),
    initialQty: weight.max(1_000_000),
    minQuantity: weight.max(1_000_000),
    tolerance: weight.max(1_000_000).optional(),
    code: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[\w.-]+$/)
      .optional(),
  })
  .refine(
    (p) => p.unitWeight * p.initialQty <= MAX_WEIGHT,
    "Peso inicial acima do limite.",
  );
export const productPatch = z.strictObject({
  name: z.string().trim().min(1).max(160).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  prateleiraId: id.optional(),
  minQuantity: weight.max(1_000_000).optional(),
  tolerance: weight.max(1_000_000).optional(),
  expectedVersion: z.number().int().positive(),
});
export const manualInput = z.strictObject({
  weight,
  expectedVersion: z.number().int().positive(),
});
export const adjustInput = z.strictObject({
  deltaUnits: z.union([z.literal(-1), z.literal(1)]),
});
export const sensorInput = z.strictObject({
  esp32_id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[\w.-]+$/),
  balanca_id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[\w.-]+$/),
  peso: weight,
  timestamp: z.string().min(19).max(35),
});
export function parseTimestamp(value) {
  // Firmware descrito usa hora de Brasília sem sufixo. Datas novas podem usar Z/offset.
  const match =
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?$/.exec(
      value,
    );
  if (!match) throw new HttpError(400, "Timestamp inválido; use ISO 8601.");
  const wall = `${match[1]}T${match[2]}${match[3] || ""}`;
  const wallDate = new Date(`${wall}Z`);
  if (
    !Number.isFinite(wallDate.getTime()) ||
    wallDate.toISOString().slice(0, 19) !== wall.slice(0, 19)
  )
    throw new HttpError(400, "Data/hora inválida.");
  const date = new Date(wall + (match[4] || "-03:00"));
  if (
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() < 1970 ||
    date.getTime() > Date.now() + 300_000
  )
    throw new HttpError(
      400,
      "Data/hora inválida ou no futuro. Sincronize o relógio do dispositivo.",
    );
  return date;
}
export function parseRange(query) {
  const values = z
    .object({
      inicio: z.iso.datetime({ offset: true }),
      fim: z.iso.datetime({ offset: true }),
    })
    .parse(query);
  const start = new Date(values.inicio),
    end = new Date(values.fim);
  if (end < start || end - start > 370 * 86400000)
    throw new HttpError(400, "Período inválido; máximo de 370 dias.");
  return { start, end };
}
