import test from "node:test";
import assert from "node:assert/strict";
import { calculateMovement } from "../api/src/services/movement.js";
import {
  manualInput,
  productInput,
  parseTimestamp,
} from "../api/src/validation.js";
import {
  getPeriodRange,
  shiftDate,
  qtyOf,
  statusOf,
} from "../gieci-client/src/utils/format.js";

test("peso autoritativo, tolerância e confiança das leituras", () => {
  assert.deepEqual(
    calculateMovement({ before: 2000, after: 1000, unitWeight: 1000 }),
    { variation: -1000, quantity: 1, confidence: 100, type: "SAIDA" },
  );
  assert.equal(
    calculateMovement({
      before: 1000,
      after: 1004,
      unitWeight: 1000,
      tolerance: 5,
      sensor: true,
    }),
    null,
  );
  assert.equal(
    calculateMovement({
      before: 1000,
      after: 1000,
      unitWeight: 1000,
      tolerance: 0,
      sensor: true,
    }),
    null,
  );
  assert.equal(
    calculateMovement({ before: 0, after: 1500, unitWeight: 1000 }).confidence,
    0,
  );
  assert.equal(
    calculateMovement({ before: 0, after: 980, unitWeight: 1000 }).confidence,
    96,
  );
  assert.equal(
    calculateMovement({ before: 0, after: 500, unitWeight: 1000 }).quantity,
    1,
  );
  assert.throws(() =>
    calculateMovement({ before: 0, after: Infinity, unitWeight: 1000 }),
  );
});
test("validação rejeita campos extras, negativos, strings numéricas e pesos fora do limite", () => {
  for (const weight of [-1, Infinity, NaN, "1000", null, 1e10, 0.0001])
    assert.equal(
      manualInput.safeParse({ weight, expectedVersion: 1 }).success,
      false,
    );
  assert.equal(
    manualInput.safeParse({ weight: 0.125, expectedVersion: 1 }).success,
    true,
  );
  assert.equal(
    manualInput.safeParse({ weight: 1, expectedVersion: 1, admin: true })
      .success,
    false,
  );
  assert.equal(
    productInput.safeParse({
      name: "Teste",
      category: "Outros",
      prateleiraId: "1",
      unitWeight: 1000,
      initialQty: 1e9,
      minQuantity: 0,
    }).success,
    false,
  );
});
test("timestamp do firmware sem offset é interpretado em Brasília", () => {
  assert.equal(
    parseTimestamp("2020-01-01T10:00:00").toISOString(),
    "2020-01-01T13:00:00.000Z",
  );
  assert.equal(
    parseTimestamp("2020-01-01T10:00:00Z").toISOString(),
    "2020-01-01T10:00:00.000Z",
  );
  for (const value of [
    "2020-02-31T10:00:00",
    "2020-01-01T25:00:00",
    "abc",
    "2999-01-01T00:00:00Z",
  ])
    assert.throws(() => parseTimestamp(value));
});
test("relatório mensal não pula fevereiro ao navegar a partir do dia 31", () => {
  const next = shiftDate("mes", new Date(2026, 0, 31), 1);
  assert.equal(next.getMonth(), 1);
  assert.equal(next.getDate(), 1);
  const back = shiftDate("mes", new Date(2026, 2, 31), -1);
  assert.equal(back.getMonth(), 1);
  const week = getPeriodRange("semana", new Date(2026, 8, 20));
  assert.equal(week.start.getDay(), 1);
  assert.equal(week.end.getDay(), 0);
});
test("quantidade e alertas continuam derivados do peso atual", () => {
  const product = { currentWeight: 1500, unitWeight: 1000, minQuantity: 4 };
  assert.equal(qtyOf(product), 1.5);
  assert.equal(statusOf(product).key, "critico");
  assert.equal(statusOf({ ...product, currentWeight: 4000 }).key, "baixo");
  assert.equal(statusOf({ ...product, currentWeight: 5000 }).key, "ok");
});
