export const armarioDTO = (r) => ({ id: String(r.id), name: r.nome });
export const prateleiraDTO = (r) => ({
  id: String(r.id),
  name: r.nome,
  armarioId: r.armario_id ? String(r.armario_id) : null,
});
export const productDTO = (r) => ({
  id: String(r.id),
  code: r.codigo,
  name: r.nome,
  category: r.categoria,
  prateleiraId: r.prateleira_id ? String(r.prateleira_id) : null,
  unitWeight: Number(r.peso_unitario),
  currentWeight: Number(r.peso_atual),
  minQuantity: Number(r.quantidade_minima),
  tolerance: Number(r.tolerancia_peso),
  version: r.versao,
});
export const historyDTO = (r) => ({
  id: String(r.id),
  productId: String(r.produto_id),
  productName: r.produto_nome,
  type: r.tipo_movimentacao.toLowerCase(),
  quantityChanged: Number(r.quantidade),
  weightBefore: Number(r.peso_anterior),
  weightAfter: Number(r.peso_atual),
  confidence: r.confianca,
  origin: r.origem,
  timestamp: new Date(r.data_hora).getTime(),
});
