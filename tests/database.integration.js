import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { loadConfig } from "../api/src/config.js";
import { createPool } from "../api/src/db.js";
import { createApp } from "../api/src/app.js";

// Banco temporário exclusivo. Nunca utiliza DB_NAME nem apaga um banco do usuário.
const dbName = "gieci_test_" + randomBytes(6).toString("hex");
const config = loadConfig({
  ...process.env,
  DB_NAME: dbName,
  NODE_ENV: "test",
  ALLOWED_ORIGINS: "http://localhost:5173",
});
const { database, ...adminOptions } = config.db;
let admin, pool, server, base, cookie, csrf;
const token = randomBytes(32).toString("hex");
async function call(
  path,
  {
    method = "GET",
    body,
    auth = true,
    headers = {},
    origin = "http://localhost:5173",
  } = {},
) {
  const h = {
    "Content-Type": "application/json",
    ...(origin ? { Origin: origin } : {}),
    ...(auth ? { Cookie: cookie || "", "X-CSRF-Token": csrf || "" } : {}),
    ...headers,
  };
  const response = await fetch(base + path, {
    method,
    headers: h,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = response.status === 204 ? null : await response.json();
  return { response, status: response.status, data };
}
async function ok(path, opts, expected = 200) {
  const r = await call(path, opts);
  assert.equal(r.status, expected, JSON.stringify(r.data));
  return r.data;
}

test("API + MySQL: autenticação, CRUD, concorrência, histórico e ESP32", async (t) => {
  admin = await mysql.createConnection(adminOptions);
  await admin.query(
    `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  pool = createPool(config);
  const schema = await readFile(
    new URL("../database/schema.sql", import.meta.url),
    "utf8",
  );
  try {
    for (const statement of schema
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await pool.query(statement);
    await pool.execute(
      "INSERT INTO usuarios (nome,email,senha_hash) VALUES (?,?,?)",
      [
        "Operador de teste",
        "teste@example.invalid",
        await bcrypt.hash("senha-apenas-para-testes", 4),
      ],
    );
    const app = createApp({ pool, config });
    server = app.listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    base = `http://127.0.0.1:${server.address().port}/api`;
    config.origins.push(base.slice(0, -4));
    await t.test("sessão, CSRF e origem", async () => {
      assert.equal((await call("/produtos", { auth: false })).status, 401);
      assert.equal(
        (
          await call("/auth/login", {
            method: "POST",
            auth: false,
            origin: "https://invalid.example",
            body: {
              email: "teste@example.invalid",
              password: "senha-apenas-para-testes",
            },
          })
        ).status,
        403,
      );
      const r = await call("/auth/login", {
        method: "POST",
        auth: false,
        body: {
          email: "teste@example.invalid",
          password: "senha-apenas-para-testes",
        },
      });
      assert.equal(r.status, 200);
      cookie = r.response.headers.get("set-cookie").split(";")[0];
      csrf = r.data.csrfToken;
      assert.match(r.response.headers.get("set-cookie"), /HttpOnly/);
      assert.match(r.response.headers.get("set-cookie"), /SameSite=Strict/);
      assert.equal(
        (
          await call("/armarios", {
            method: "POST",
            body: { name: "Sem CSRF" },
            headers: { "X-CSRF-Token": "" },
          })
        ).status,
        403,
      );
      assert.equal((await ok("/auth/session")).user.name, "Operador de teste");
    });
    const cabinet = await ok(
      "/armarios",
      { method: "POST", body: { name: "Estoque de teste" } },
      201,
    );
    const shelf = await ok(
      "/prateleiras",
      {
        method: "POST",
        body: { name: "Prateleira de teste", armarioId: cabinet.id },
      },
      201,
    );
    const product = await ok(
      "/produtos",
      {
        method: "POST",
        body: {
          name: "Arroz teste",
          category: "Grãos e Cereais",
          prateleiraId: shelf.id,
          unitWeight: 1000,
          initialQty: 2,
          minQuantity: 1,
        },
      },
      201,
    );
    await t.test("vínculos, duplicação e validação", async () => {
      assert.equal(
        (
          await call("/armarios", {
            method: "POST",
            body: { name: "Estoque de teste" },
          })
        ).status,
        409,
      );
      assert.equal(
        (await call("/armarios/" + cabinet.id, { method: "DELETE" })).status,
        409,
      );
      assert.equal(
        (await call("/prateleiras/" + shelf.id, { method: "DELETE" })).status,
        409,
      );
      assert.equal(
        (
          await call("/produtos/" + product.id + "/leitura", {
            method: "POST",
            body: { weight: -1, expectedVersion: product.version },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await call("/produtos/" + product.id + "/leitura", {
            method: "POST",
            body: { weight: 1, expectedVersion: 1 },
          })
        ).status,
        409,
      );
      const injected = await ok(
        "/armarios",
        { method: "POST", body: { name: "Nome '); DROP TABLE produtos; --" } },
        201,
      );
      assert.ok((await ok("/produtos")).length);
      await ok("/armarios/" + injected.id, { method: "DELETE" }, 204);
    });
    await t.test("ajustes concorrentes não perdem atualizações", async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          call("/produtos/" + product.id + "/ajuste", {
            method: "POST",
            body: { deltaUnits: 1 },
          }),
        ),
      );
      results.forEach((r) => assert.equal(r.status, 200));
      assert.equal((await ok("/produtos"))[0].currentWeight, 12000);
      assert.equal((await ok("/historico")).items.length, 11);
    });
    await t.test("rollback mantém estoque e histórico juntos", async () => {
      const before = (await ok("/historico")).items.length;
      await pool.query(
        `CREATE TRIGGER fail_test BEFORE INSERT ON movimentacoes FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='falha controlada'`,
      );
      const response = await call("/produtos/" + product.id + "/ajuste", {
        method: "POST",
        body: { deltaUnits: 1 },
      });
      assert.equal(response.status, 503);
      await pool.query("DROP TRIGGER fail_test");
      assert.equal((await ok("/produtos"))[0].currentWeight, 12000);
      assert.equal((await ok("/historico")).items.length, before);
    });
    const sensorProduct = await ok(
      "/produtos",
      {
        method: "POST",
        body: {
          name: "Sensor teste",
          category: "Outros",
          prateleiraId: shelf.id,
          unitWeight: 1000,
          initialQty: 0,
          minQuantity: 1,
        },
      },
      201,
    );
    const [device] = await pool.execute(
      "INSERT INTO dispositivos (dispositivo_id,token_hash) VALUES (?,?)",
      ["ESP32_001", await bcrypt.hash(token, 4)],
    );
    await pool.execute(
      "INSERT INTO balancas (identificacao,dispositivo_id,produto_id) VALUES (?,?,?)",
      ["BAL001", device.insertId, sensorProduct.id],
    );
    const sensor = (peso, timestamp, extra = {}) =>
      call("/peso", {
        method: "POST",
        auth: false,
        origin: null,
        headers: { Authorization: "Bearer " + token },
        body: {
          esp32_id: "ESP32_001",
          balanca_id: "BAL001",
          peso,
          timestamp,
          ...extra,
        },
      });
    await t.test(
      "sensor autenticado: duplicação, ordem e tolerância",
      async () => {
        let r = await sensor(2000, "2020-01-01T12:00:00");
        assert.equal(r.status, 200);
        assert.equal(r.data.movimentacao, "ENTRADA");
        assert.equal(
          (await sensor(2000, "2020-01-01T12:00:00")).data.motivo,
          "leitura_antiga_ou_repetida",
        );
        assert.equal(
          (await sensor(8000, "2020-01-01T11:59:59")).data.ignorada,
          true,
        );
        assert.equal(
          (await sensor(2003, "2020-01-01T12:00:01")).data.motivo,
          "ruido",
        );
        r = await sensor(1000, "2020-01-01T12:00:02");
        assert.equal(r.data.movimentacao, "SAIDA");
        assert.equal(r.data.quantidade, 1);
        assert.equal(
          (await sensor(1000, "2020-01-01T12:00:03", { balanca_id: "OUTRA" }))
            .status,
          404,
        );
        const bad = await call("/peso", {
          method: "POST",
          auth: false,
          origin: null,
          headers: { Authorization: "Bearer " + "0".repeat(64) },
          body: {
            esp32_id: "ESP32_001",
            balanca_id: "BAL001",
            peso: 0,
            timestamp: "2020-01-01T12:00:04",
          },
        });
        assert.equal(bad.status, 401);
        const p = (await ok("/produtos")).find(
          (p) => p.id === sensorProduct.id,
        );
        assert.equal(p.currentWeight, 1000);
        await ok("/produtos/" + p.id + "/leitura", {
          method: "POST",
          body: { weight: 1000, expectedVersion: p.version },
        });
        assert.equal(
          (await sensor(0, "2020-01-01T12:00:04")).data.ignorada,
          true,
        );
        const confirmed = (await ok("/produtos")).find((x) => x.id === p.id);
        await ok("/produtos/" + p.id + "/leitura", {
          method: "POST",
          body: { weight: 3000, expectedVersion: confirmed.version },
        });
        assert.equal(
          (await sensor(0, "2020-01-01T12:00:05")).data.ignorada,
          true,
        );
        assert.equal(
          (await ok("/produtos")).find((p) => p.id === sensorProduct.id)
            .currentWeight,
          3000,
        );
      },
    );
    await t.test("paginação não trunca relatórios", async () => {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        for (let i = 0; i < 105; i++)
          await conn.execute(
            "INSERT INTO movimentacoes (produto_id,produto_nome,tipo_movimentacao,origem,quantidade,peso_anterior,peso_atual,variacao,confianca,data_hora) VALUES (?,?,'ENTRADA','manual',1,0,1000,1000,100,'2020-01-01 12:00:00')",
            [product.id, product.name],
          );
        await conn.commit();
      } finally {
        conn.release();
      }
      const first = await ok("/historico?limit=100");
      assert.equal(first.items.length, 100);
      assert.ok(first.nextCursor);
      const second = await ok("/historico?cursor=" + first.nextCursor);
      assert.ok(second.items.length > 0);
      assert.ok(
        !second.items.some((x) => first.items.some((y) => y.id === x.id)),
      );
      const currentProduct = (await ok("/produtos")).find(
        (p) => p.id === product.id,
      );
      await ok("/produtos/" + product.id, {
        method: "PATCH",
        body: {
          name: "Arroz renomeado",
          expectedVersion: currentProduct.version,
        },
      });
      const report = await ok(
        "/relatorios?inicio=2020-01-01T00:00:00Z&fim=2020-01-01T23:59:59Z",
      );
      assert.equal(
        report.rows.find((r) => r.productId === product.id).entradaQty,
        105,
      );
      assert.equal(
        report.rows.find((r) => r.productId === product.id).productName,
        "Arroz renomeado",
      );
    });
    await t.test(
      "exclusão preserva histórico e exige saldo zerado",
      async () => {
        assert.equal(
          (await call("/produtos/" + product.id, { method: "DELETE" })).status,
          409,
        );
        const p = (await ok("/produtos")).find((p) => p.id === product.id);
        await ok("/produtos/" + p.id + "/leitura", {
          method: "POST",
          body: { weight: 0, expectedVersion: p.version },
        });
        await ok("/produtos/" + p.id, { method: "DELETE" }, 204);
        assert.ok((await ok("/historico?productId=" + p.id)).items.length > 0);
        assert.ok(!(await ok("/produtos")).some((x) => x.id === p.id));
      },
    );
    if (process.env.RUN_BROWSER_TESTS === "1")
      await t.test(
        "frontend real: login, cadastro, peso, persistência, indisponibilidade e logout",
        async () => {
          const { chromium } = await import("playwright");
          const browser = await chromium.launch({
            headless: true,
            ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
              ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
              : {}),
            args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
          });
          try {
            const page = await browser.newPage({
              viewport: { width: 375, height: 850 },
            });
            const errors = [];
            page.on("pageerror", (e) => errors.push(e.message));
            await page.addInitScript(() => {
              window.cspErrors = [];
              document.addEventListener("securitypolicyviolation", (e) =>
                window.cspErrors.push(e.violatedDirective),
              );
            });
            const { expect } = await import("@playwright/test");
            await page.goto(base.slice(0, -4));
            await page
              .getByLabel("E-mail", { exact: true })
              .fill("teste@example.invalid");
            await page
              .getByLabel("Senha", { exact: true })
              .fill("senha-apenas-para-testes");
            await page
              .getByRole("button", { name: "Entrar", exact: true })
              .click();
            await expect(
              page.getByText("Estoque sincronizado com o servidor", {
                exact: true,
              }),
            ).toBeVisible();
            await expect(
              page.getByRole("button", {
                name: "Restaurar dados de exemplo",
                exact: true,
              }),
            ).toHaveCount(0);
            await page
              .getByRole("button", { name: "Cadastrar Produto", exact: true })
              .click();
            await page
              .getByLabel("Nome do produto", { exact: true })
              .fill("Produto UI Real");
            await page
              .getByLabel("Peso unitário (g)", { exact: true })
              .fill("1000");
            await page
              .getByLabel("Prateleira", { exact: true })
              .selectOption(shelf.id);
            await page
              .getByLabel("Quantidade inicial (unid.)", { exact: true })
              .fill("3");
            await page
              .getByLabel("Qtd. mínima para alerta (unid.)", { exact: true })
              .fill("1");
            await page
              .getByRole("button", { name: "Cadastrar produto", exact: true })
              .last()
              .click();
            const card = page
              .locator(".g-card")
              .filter({ hasText: "Produto UI Real" });
            await expect(card).toBeVisible();
            await card.getByTitle("Retirar 1 unidade", { exact: true }).click();
            await expect(card.locator(".g-readout-weight")).toHaveText("2 kg");
            await card
              .getByRole("button", { name: "Ajustar peso", exact: true })
              .click();
            await card.locator("input").fill("1250.125");
            await card
              .getByRole("button", { name: "Enviar", exact: true })
              .click();
            await expect(card.locator(".g-readout-weight")).toHaveText(
              "1.25 kg",
            );
            await page.reload();
            await expect(card.locator(".g-readout-weight")).toHaveText(
              "1.25 kg",
            );
            await page
              .getByRole("button", { name: "Histórico", exact: true })
              .click();
            await expect(
              page
                .locator(".g-history-row")
                .filter({ hasText: "Produto UI Real" }),
            ).toHaveCount(3);
            await page
              .getByRole("button", { name: "Relatórios", exact: true })
              .click();
            await expect(
              page.locator("tbody tr").filter({ hasText: "Produto UI Real" }),
            ).toBeVisible();
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
              true,
            );
            await page.route("**/api/estado?**", (route) => route.abort());
            await page.reload();
            await expect(page.locator(".g-notice")).toContainText(
              "Sem conexão",
            );
            await expect(
              page.getByText("Arroz Branco Tipo 1", { exact: true }),
            ).toHaveCount(0);
            await page.unroute("**/api/estado?**");
            await page
              .getByRole("button", { name: "Tentar novamente", exact: true })
              .click();
            await expect(card).toBeVisible();
            assert.deepEqual(await page.evaluate(() => window.cspErrors), []);
            assert.deepEqual(errors, []);
            await page
              .getByRole("button", { name: "Sair", exact: true })
              .click();
            await expect(
              page.getByRole("button", { name: "Entrar", exact: true }),
            ).toBeVisible();
          } finally {
            await browser.close();
          }
        },
      );
    await t.test("logout revoga a sessão", async () => {
      await ok("/auth/logout", { method: "POST", body: {} }, 204);
      assert.equal((await call("/produtos")).status, 401);
    });
  } finally {
    if (server) await new Promise((r) => server.close(r));
    if (pool) await pool.end();
    await admin.query(`DROP DATABASE \`${dbName}\``);
    await admin.end();
  }
});
