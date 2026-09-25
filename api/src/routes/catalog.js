import { Router } from "express";
import { randomUUID } from "node:crypto";
import { transaction } from "../db.js";
import { HttpError, notFound } from "../errors.js";
import {
  id,
  armarioInput,
  prateleiraInput,
  productInput,
  productPatch,
  manualInput,
  adjustInput,
} from "../validation.js";
import { armarioDTO, prateleiraDTO, productDTO } from "../services/dto.js";
import {
  applyMovement,
  manualReading,
  roundWeight,
} from "../services/movement.js";

export function catalogRoutes(pool) {
  const router = Router();
  // Nomes SQL são fixos, nunca interpolados a partir de parâmetros da requisição.
  router.get("/armarios", async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM armarios ORDER BY id");
    res.json(rows.map(armarioDTO));
  });
  router.post("/armarios", async (req, res) => {
    const data = armarioInput.parse(req.body);
    const [result] = await pool.execute(
      "INSERT INTO armarios (nome) VALUES (?)",
      [data.name],
    );
    res.status(201).json({ id: String(result.insertId), name: data.name });
  });
  router.patch("/armarios/:id", async (req, res) => {
    const record = id.parse(req.params.id),
      data = armarioInput.parse(req.body);
    const [result] = await pool.execute(
      "UPDATE armarios SET nome=? WHERE id=?",
      [data.name, record],
    );
    if (!result.affectedRows) throw notFound();
    res.json({ id: record, name: data.name });
  });
  router.delete("/armarios/:id", async (req, res) => {
    const record = id.parse(req.params.id);
    const [result] = await pool.execute("DELETE FROM armarios WHERE id=?", [
      record,
    ]);
    if (!result.affectedRows) throw notFound();
    res.status(204).end();
  });
  router.get("/prateleiras", async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM prateleiras ORDER BY id");
    res.json(rows.map(prateleiraDTO));
  });
  router.post("/prateleiras", async (req, res) => {
    const data = prateleiraInput.parse(req.body);
    const [result] = await pool.execute(
      "INSERT INTO prateleiras (nome,armario_id) VALUES (?,?)",
      [data.name, data.armarioId],
    );
    res.status(201).json({ id: String(result.insertId), ...data });
  });
  router.patch("/prateleiras/:id", async (req, res) => {
    const record = id.parse(req.params.id),
      data = prateleiraInput
        .partial()
        .refine((d) => Object.keys(d).length > 0)
        .parse(req.body);
    await transaction(pool, async (conn) => {
      const [[current]] = await conn.execute(
        "SELECT * FROM prateleiras WHERE id=? FOR UPDATE",
        [record],
      );
      if (!current) throw notFound();
      await conn.execute(
        "UPDATE prateleiras SET nome=?,armario_id=? WHERE id=?",
        [
          data.name ?? current.nome,
          data.armarioId === undefined ? current.armario_id : data.armarioId,
          record,
        ],
      );
    });
    res.json({ sucesso: true });
  });
  router.delete("/prateleiras/:id", async (req, res) => {
    const record = id.parse(req.params.id);
    await transaction(pool, async (conn) => {
      const [[shelf]] = await conn.execute(
        "SELECT id FROM prateleiras WHERE id=? FOR UPDATE",
        [record],
      );
      if (!shelf) throw notFound();
      const [[product]] = await conn.execute(
        "SELECT id FROM produtos WHERE prateleira_id=? AND ativo=1 LIMIT 1",
        [record],
      );
      if (product)
        throw new HttpError(
          409,
          "Remova ou mova os produtos desta prateleira primeiro.",
        );
      await conn.execute("DELETE FROM prateleiras WHERE id=?", [record]);
    });
    res.status(204).end();
  });
  router.get("/produtos", async (req, res) => {
    const [rows] = await pool.query(
      "SELECT * FROM produtos WHERE ativo=1 ORDER BY id",
    );
    res.json(rows.map(productDTO));
  });
  router.post("/produtos", async (req, res) => {
    const data = productInput.parse(req.body);
    const product = await transaction(pool, async (conn) => {
      const [result] = await conn.execute(
        "INSERT INTO produtos (codigo,nome,categoria,prateleira_id,peso_unitario,quantidade_minima,tolerancia_peso) VALUES (?,?,?,?,?,?,?)",
        [
          data.code || `GIECI-${randomUUID()}`,
          data.name,
          data.category,
          data.prateleiraId,
          data.unitWeight,
          data.minQuantity,
          data.tolerance ?? 5,
        ],
      );
      const [[p]] = await conn.execute("SELECT * FROM produtos WHERE id=?", [
        result.insertId,
      ]);
      const after = roundWeight(data.unitWeight * data.initialQty);
      if (after > 0)
        await applyMovement(conn, p, {
          after,
          date: new Date(),
          origin: "manual",
          userId: req.session.usuario_id,
        });
      const [[saved]] = await conn.execute(
        "SELECT * FROM produtos WHERE id=?",
        [result.insertId],
      );
      return productDTO(saved);
    });
    res.status(201).json(product);
  });
  router.patch("/produtos/:id", async (req, res) => {
    const record = id.parse(req.params.id),
      data = productPatch.parse(req.body);
    await transaction(pool, async (conn) => {
      const [[p]] = await conn.execute(
        "SELECT * FROM produtos WHERE id=? AND ativo=1 FOR UPDATE",
        [record],
      );
      if (!p) throw notFound();
      if (p.versao !== data.expectedVersion)
        throw new HttpError(
          409,
          "Produto atualizado por outra operação. Atualize a página.",
        );
      await conn.execute(
        "UPDATE produtos SET nome=?,categoria=?,prateleira_id=?,quantidade_minima=?,tolerancia_peso=?,versao=versao+1 WHERE id=?",
        [
          data.name ?? p.nome,
          data.category ?? p.categoria,
          data.prateleiraId ?? p.prateleira_id,
          data.minQuantity ?? p.quantidade_minima,
          data.tolerance ?? p.tolerancia_peso,
          record,
        ],
      );
    });
    res.json({ sucesso: true });
  });
  router.delete("/produtos/:id", async (req, res) => {
    const record = id.parse(req.params.id);
    await transaction(pool, async (conn) => {
      const [[p]] = await conn.execute(
        "SELECT * FROM produtos WHERE id=? AND ativo=1 FOR UPDATE",
        [record],
      );
      if (!p) throw notFound();
      const [[balance]] = await conn.execute(
        "SELECT id FROM balancas WHERE produto_id=? AND ativo=1 LIMIT 1",
        [record],
      );
      if (balance)
        throw new HttpError(
          409,
          "Desative a balança vinculada antes de remover o produto.",
        );
      if (Number(p.peso_atual) !== 0)
        throw new HttpError(
          409,
          "Zere o estoque com uma leitura manual antes de remover o produto.",
        );
      await conn.execute(
        "UPDATE produtos SET ativo=0,versao=versao+1 WHERE id=?",
        [record],
      );
    });
    res.status(204).end();
  });
  router.post("/produtos/:id/leitura", async (req, res) =>
    res.json(
      await manualReading(
        pool,
        id.parse(req.params.id),
        manualInput.parse(req.body),
        req.session.usuario_id,
      ),
    ),
  );
  router.post("/produtos/:id/ajuste", async (req, res) =>
    res.json(
      await manualReading(
        pool,
        id.parse(req.params.id),
        adjustInput.parse(req.body),
        req.session.usuario_id,
      ),
    ),
  );
  return router;
}
