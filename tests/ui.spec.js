import { test, expect } from "@playwright/test";
import express from "express";
import { fileURLToPath } from "node:url";
let server, base;
test.beforeAll(async () => {
  const app = express();
  app.use(
    express.static(
      fileURLToPath(new URL("../gieci-client/dist-demo", import.meta.url)),
    ),
  );
  server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async () => {
  await new Promise((r) => server.close(r));
});

for (const width of [320, 375, 768, 1440]) {
  test(`telas sem erros e sem transbordamento a ${width}px`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base);
    await expect(page.locator(".g-card")).toHaveCount(4);
    await page.evaluate(() => document.fonts.ready);
    for (const tab of [
      "Painel de Prateleiras",
      "Armários & Prateleiras",
      "Cadastrar Produto",
      "Histórico",
      "Relatórios",
    ]) {
      await page.getByRole("button", { name: tab, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await page
      .getByRole("button", { name: "Painel de Prateleiras", exact: true })
      .click();
    await page.screenshot({
      path: `test-results/painel-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

test("cadastro, edição, leitura, histórico, relatório, persistência e remoção", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await expect(page.locator(".g-card")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Armários & Prateleiras", exact: true })
    .click();
  await page
    .getByPlaceholder("Nome do armário (ex: Câmara Fria 2)")
    .fill("Armário QA");
  await page.locator(".g-org-form").first().getByRole("button").click();
  await expect(
    page.getByRole("button", { name: "Armário QA", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Armário QA", exact: true }).click();
  await page.getByLabel("Novo nome").fill("Armário Editado");
  await page.getByLabel("Novo nome").press("Enter");
  await expect(
    page.getByRole("button", { name: "Armário Editado", exact: true }),
  ).toBeVisible();
  await page
    .getByPlaceholder("Nome da prateleira (ex: Prateleira C1)")
    .fill("Prateleira QA");
  await page
    .locator(".g-org-form.column select")
    .selectOption({ label: "Armário Editado" });
  await page
    .getByRole("button", { name: "Adicionar prateleira", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Prateleira QA", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cadastrar Produto", exact: true })
    .click();
  await page.getByLabel("Nome do produto", { exact: true }).fill("Produto QA");
  await page.getByLabel("Peso unitário (g)", { exact: true }).fill("1000");
  await page
    .getByLabel("Prateleira", { exact: true })
    .selectOption({ label: "Prateleira QA" });
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
  const card = page.locator(".g-card").filter({ hasText: "Produto QA" });
  await expect(card).toBeVisible();
  await card
    .getByTitle("Simular retirada de 1 unidade", { exact: true })
    .click();
  await expect(card.locator(".g-readout-weight")).toHaveText("2 kg");
  await card
    .getByRole("button", { name: "Simular leitura", exact: true })
    .click();
  await card.locator("input").fill("1250");
  await card.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(card.locator(".g-readout-weight")).toHaveText("1.25 kg");
  await page.reload();
  await expect(
    page
      .locator(".g-card")
      .filter({ hasText: "Produto QA" })
      .locator(".g-readout-weight"),
  ).toHaveText("1.25 kg");
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  await expect(
    page.locator(".g-history-row").filter({ hasText: "Produto QA" }),
  ).toHaveCount(3);
  await page.getByRole("button", { name: "Relatórios", exact: true }).click();
  await expect(
    page.locator("tbody tr").filter({ hasText: "Produto QA" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Painel de Prateleiras", exact: true })
    .click();
  await card
    .getByRole("button", { name: "Simular leitura", exact: true })
    .click();
  await card.locator("input").fill("0");
  await card.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(card.locator(".g-readout-weight")).toHaveText("0 g");
  await card
    .getByRole("button", { name: "Simular leitura", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await card
    .getByRole("button", { name: "Excluir produto", exact: true })
    .click();
  await expect(card).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("armazenamento indisponível é informado e não simula gravação bem-sucedida", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota", "QuotaExceededError");
    };
  });
  await page.goto(base);
  await expect(page.locator(".g-card")).toHaveCount(4);
  const card = page.locator(".g-card").first();
  const before = await card.locator(".g-readout-weight").innerText();
  await card.getByTitle("Simular retirada de 1 unidade").click();
  await expect(page.locator(".g-toast")).toContainText(
    "Não foi possível salvar",
  );
  await expect(card.locator(".g-readout-weight")).toHaveText(before);
});
