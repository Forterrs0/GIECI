import { Router } from "express";
import { z } from "zod";
import { transaction } from "../db.js";
import { parseRange, id } from "../validation.js";
import {
  armarioDTO,
  prateleiraDTO,
  productDTO,
  historyDTO,
} from "../services/dto.js";

export function queryRoutes(pool) {
  const router = Router();
  router.get("/estado", async (req, res) => {
    const range = parseRange(req.query);
    res.json(
      await transaction(
        pool,
        async (conn) => {
          const [armarios] = await conn.query(
            "SELECT * FROM armarios ORDER BY id",
          );
          const [prateleiras] = await conn.query(
            "SELECT * FROM prateleiras ORDER BY id",
          );
          const [products] = await conn.query(
            "SELECT * FROM produtos WHERE ativo=1 ORDER BY id",
          );
          const [[count]] = await conn.execute(
            "SELECT COUNT(*) AS total FROM movimentacoes WHERE data_hora>=? AND data_hora<=?",
            [range.start, range.end],
          );
          return {
            armarios: armarios.map(armarioDTO),
            prateleiras: prateleiras.map(prateleiraDTO),
            products: products.map(productDTO),
            todayCount: Number(count.total),
          };
        },
        { readOnly: true },
      ),
    );
  });
  const history = async (req, res) => {
    const data = z
      .object({
        productId: id.optional(),
        cursor: z
          .string()
          .regex(/^[1-9]\d{0,19}$/)
          .optional(),
        limit: z.coerce.number().int().min(1).max(200).default(100),
      })
      .parse(req.query);
    const conditions = [],
      params = [];
    if (data.productId) {
      conditions.push("produto_id=?");
      params.push(data.productId);
    }
    if (data.cursor) {
      conditions.push("id<?");
      params.push(data.cursor);
    }
    const [rows] = await pool.execute(
      `SELECT * FROM movimentacoes ${conditions.length ? "WHERE " + conditions.join(" AND ") : ""} ORDER BY id DESC LIMIT ${data.limit + 1}`,
      params,
    );
    const hasMore = rows.length > data.limit,
      selected = rows.slice(0, data.limit);
    res.json({
      items: selected.map(historyDTO),
      nextCursor: hasMore ? String(selected.at(-1).id) : null,
    });
  };
  router.get("/historico", history);
  router.get("/movimentacoes", history);
  router.get("/relatorios", async (req, res) => {
    const { start, end } = parseRange(req.query);
    const [rows] = await pool.execute(
      `SELECT m.produto_id, p.nome AS produto_nome,
      SUM(CASE WHEN tipo_movimentacao='SAIDA' THEN quantidade ELSE 0 END) AS saida_qty,
      SUM(CASE WHEN tipo_movimentacao='ENTRADA' THEN quantidade ELSE 0 END) AS entrada_qty,
      SUM(CASE WHEN tipo_movimentacao='SAIDA' THEN ABS(variacao) ELSE 0 END) AS saida_weight,
      SUM(CASE WHEN tipo_movimentacao='ENTRADA' THEN ABS(variacao) ELSE 0 END) AS entrada_weight
      FROM movimentacoes m JOIN produtos p ON p.id=m.produto_id WHERE m.data_hora>=? AND m.data_hora<=? GROUP BY m.produto_id,p.nome ORDER BY saida_weight DESC`,
      [start, end],
    );
    res.json({
      rows: rows.map((r) => ({
        productId: String(r.produto_id),
        productName: r.produto_nome,
        saidaQty: Number(r.saida_qty),
        entradaQty: Number(r.entrada_qty),
        saidaWeight: Number(r.saida_weight),
        entradaWeight: Number(r.entrada_weight),
      })),
    });
  });
  return router;
}
