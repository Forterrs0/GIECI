import { HttpError, notFound } from "../errors.js";
import { transaction } from "../db.js";
import { MAX_WEIGHT } from "../validation.js";
export const roundWeight = (n) =>
  Math.round((n + Number.EPSILON) * 1000) / 1000;

export function calculateMovement({
  before,
  after,
  unitWeight,
  tolerance = 0,
  sensor = false,
}) {
  if (
    ![before, after, unitWeight, tolerance].every(Number.isFinite) ||
    before < 0 ||
    after < 0 ||
    after > MAX_WEIGHT ||
    unitWeight <= 0 ||
    tolerance < 0
  )
    throw new HttpError(400, "Peso fora dos limites permitidos.");
  const variation = roundWeight(after - before);
  if (variation === 0 || (sensor && Math.abs(variation) < tolerance))
    return null;
  const quantity = Math.round(Math.abs(variation) / unitWeight);
  const residual = Math.abs(Math.abs(variation) - quantity * unitWeight);
  // Confiança cai linearmente até 0 no meio do caminho entre duas unidades.
  const confidence = Math.max(
    0,
    Math.min(100, Math.round(100 * (1 - residual / (unitWeight / 2)))),
  );
  return {
    variation,
    quantity,
    confidence,
    type: variation < 0 ? "SAIDA" : "ENTRADA",
  };
}

export async function applyMovement(
  connection,
  product,
  { after, date, origin, userId = null, balanceId = null },
) {
  const before = Number(product.peso_atual);
  const movement = calculateMovement({
    before,
    after,
    unitWeight: Number(product.peso_unitario),
    tolerance: Number(product.tolerancia_peso),
    sensor: origin === "sensor",
  });
  if (!movement)
    return {
      sucesso: true,
      ignorada: true,
      motivo: after === before ? "sem_alteracao" : "ruido",
      peso_atual: before,
    };
  await connection.execute(
    "INSERT INTO movimentacoes (produto_id,produto_nome,balanca_id,usuario_id,tipo_movimentacao,origem,quantidade,peso_anterior,peso_atual,variacao,confianca,data_hora) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    [
      product.id,
      product.nome,
      balanceId,
      userId,
      movement.type,
      origin,
      movement.quantity,
      before,
      after,
      movement.variation,
      movement.confidence,
      date,
    ],
  );
  await connection.execute(
    "UPDATE produtos SET peso_atual=?, versao=versao+1, ultima_atualizacao=? WHERE id=?",
    [after, date, product.id],
  );
  return {
    sucesso: true,
    movimentacao: movement.type,
    produto: product.nome,
    quantidade: movement.quantity,
    peso_anterior: before,
    peso_atual: after,
    variacao: movement.variation,
    confianca: movement.confidence,
  };
}

export async function manualReading(pool, productId, input, userId) {
  return transaction(pool, async (connection) => {
    const [[product]] = await connection.execute(
      "SELECT * FROM produtos WHERE id=? AND ativo=1 FOR UPDATE",
      [productId],
    );
    if (!product) throw notFound();
    if (
      input.expectedVersion !== undefined &&
      product.versao !== input.expectedVersion
    )
      throw new HttpError(
        409,
        "O estoque foi atualizado. Confira o peso atual e envie novamente.",
      );
    const after =
      input.deltaUnits === undefined
        ? input.weight
        : roundWeight(
            Math.max(
              0,
              Number(product.peso_atual) +
                input.deltaUnits * Number(product.peso_unitario),
            ),
          );
    const date = new Date();
    const result = await applyMovement(connection, product, {
      after,
      date,
      origin: "manual",
      userId,
    });
    // Mesmo peso também confirma o estado atual e invalida leituras anteriores.
    if (result.ignorada) {
      await connection.execute(
        "UPDATE produtos SET ultima_atualizacao=?, versao=versao+1 WHERE id=?",
        [date, product.id],
      );
    }
    return result;
  });
}

export async function sensorReading(pool, deviceId, input, date) {
  return transaction(pool, async (connection) => {
    const [[balance]] = await connection.execute(
      "SELECT * FROM balancas WHERE identificacao=? AND dispositivo_id=? AND ativo=1 FOR UPDATE",
      [input.balanca_id, deviceId],
    );
    if (!balance)
      throw new HttpError(404, "Balança não encontrada para este dispositivo.");
    const [[product]] = await connection.execute(
      "SELECT * FROM produtos WHERE id=? AND ativo=1 FOR UPDATE",
      [balance.produto_id],
    );
    if (!product) throw notFound();
    await connection.execute(
      "UPDATE dispositivos SET ultimo_contato=UTC_TIMESTAMP(3) WHERE id=?",
      [deviceId],
    );
    // Comparar apenas peso não bloqueia reenvios fora de ordem. Também validamos o instante.
    const baseline = Math.max(
      balance.ultima_leitura_em
        ? new Date(balance.ultima_leitura_em).getTime()
        : 0,
      product.ultima_atualizacao
        ? new Date(product.ultima_atualizacao).getTime()
        : 0,
    );
    if (date.getTime() <= baseline)
      return {
        sucesso: true,
        ignorada: true,
        motivo: "leitura_antiga_ou_repetida",
        peso_atual: Number(product.peso_atual),
      };
    const result = await applyMovement(connection, product, {
      after: input.peso,
      date,
      origin: "sensor",
      balanceId: balance.id,
    });
    await connection.execute(
      "UPDATE balancas SET ultimo_peso=?, ultima_leitura_em=? WHERE id=?",
      [input.peso, date, balance.id],
    );
    await connection.execute(
      "INSERT INTO leituras_peso (balanca_id,peso,data_hora,status) VALUES (?,?,?,?)",
      [balance.id, input.peso, date, result.ignorada ? "ruido" : "aplicada"],
    );
    return result;
  });
}
