import {
  ARMARIOS_INICIAIS,
  PRATELEIRAS_INICIAIS,
  PRODUTOS_INICIAIS,
  HISTORICO_INICIAL,
} from "../data/initial.js";
import { isToday } from "../utils/format.js";

export const STORAGE_KEY = "gieci-estoque-v1";
const uid = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
const round = (n) => Math.round(n * 1000) / 1000;
const number = (n, min = 0, max = 1e9) => {
  if (
    typeof n !== "number" ||
    !Number.isFinite(n) ||
    n < min ||
    n > max ||
    Math.abs(n * 1000 - Math.round(n * 1000)) > 0.001
  )
    throw new Error("Informe um número válido, com até 3 casas decimais.");
  return n;
};
const name = (n, max = 120) => {
  if (typeof n !== "string" || !n.trim() || n.trim().length > max)
    throw new Error(`Informe um nome de até ${max} caracteres.`);
  return n.trim();
};
function normalize(data) {
  if (
    !data ||
    !["armarios", "prateleiras", "products", "history"].every((k) =>
      Array.isArray(data[k]),
    )
  )
    throw new Error("Dados de demonstração inválidos.");
  const armarios = data.armarios.map((a) => ({
    id: String(a.id),
    name: name(a.name),
  }));
  const prateleiras = data.prateleiras.map((p) => ({
    id: String(p.id),
    name: name(p.name),
    armarioId: p.armarioId ? String(p.armarioId) : null,
  }));
  const products = data.products.map((p) => ({
    ...p,
    id: String(p.id),
    name: name(p.name, 160),
    category: name(p.category, 80),
    prateleiraId: String(p.prateleiraId),
    unitWeight: number(p.unitWeight, 0.001),
    currentWeight: number(p.currentWeight),
    minQuantity: number(p.minQuantity),
    version: p.version || 1,
  }));
  const history = data.history.map((h) => ({
    ...h,
    id: String(h.id),
    productId: String(h.productId),
    productName: name(h.productName, 160),
    timestamp: number(h.timestamp, 0, Number.MAX_SAFE_INTEGER),
    quantityChanged: number(h.quantityChanged, 0, 1e15),
    weightBefore: number(h.weightBefore),
    weightAfter: number(h.weightAfter),
  }));
  if (
    prateleiras.some(
      (p) => p.armarioId && !armarios.some((a) => a.id === p.armarioId),
    ) ||
    products.some((p) => !prateleiras.some((s) => s.id === p.prateleiraId))
  )
    throw new Error("Há vínculos inválidos nos dados de demonstração.");
  for (const list of [armarios, prateleiras, products, history])
    if (new Set(list.map((x) => x.id)).size !== list.length)
      throw new Error("Há identificadores duplicados na demonstração.");
  if (history.some((h) => !["entrada", "saida"].includes(h.type)))
    throw new Error("Histórico de demonstração inválido.");
  return { armarios, prateleiras, products, history };
}
function initial() {
  return normalize(
    structuredClone({
      armarios: ARMARIOS_INICIAIS,
      prateleiras: PRATELEIRAS_INICIAIS,
      products: PRODUTOS_INICIAIS,
      history: HISTORICO_INICIAL,
    }),
  );
}
function read() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new Error("O navegador bloqueou o armazenamento da demonstração.");
  }
  if (!raw) return initial();
  try {
    return normalize(JSON.parse(raw));
  } catch {
    throw new Error(
      "Os dados locais estão corrompidos. Faça uma cópia antes de limpar o armazenamento deste site.",
    );
  }
}
function write(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    throw new Error(
      "Não foi possível salvar: armazenamento bloqueado ou cheio.",
    );
  }
}
async function mutate(fn) {
  const work = () => {
    const state = read();
    const result = fn(state);
    write(state);
    return result;
  };
  return navigator.locks
    ? navigator.locks.request("gieci-demo-write", work)
    : work();
}
const find = (list, id) => {
  const item = list.find((x) => x.id === id);
  if (!item) throw new Error("Registro não encontrado. Atualize os dados.");
  return item;
};
const unique = (list, value, ignore) => {
  if (
    list.some(
      (x) =>
        x.id !== ignore &&
        x.name.localeCompare(value, "pt-BR", { sensitivity: "base" }) === 0,
    )
  )
    throw new Error("Já existe um registro com esse nome.");
};
function reading(state, id, after, expectedVersion) {
  const product = find(state.products, id);
  number(after);
  if (expectedVersion !== undefined && expectedVersion !== product.version)
    throw new Error("O produto foi atualizado. Confira o peso atual.");
  const before = product.currentWeight,
    diff = round(after - before);
  if (!diff) return { ignorada: true, peso_atual: before };
  const quantity = Math.round(Math.abs(diff) / product.unitWeight);
  product.currentWeight = after;
  product.version++;
  state.history.unshift({
    id: uid(),
    productId: id,
    productName: product.name,
    type: diff < 0 ? "saida" : "entrada",
    quantityChanged: quantity,
    weightBefore: before,
    weightAfter: after,
    timestamp: Date.now(),
    origin: "manual",
  });
  return {
    produto: product.name,
    movimentacao: diff < 0 ? "SAIDA" : "ENTRADA",
    quantidade: quantity,
    peso_anterior: before,
    peso_atual: after,
  };
}
export const demoStore = {
  async getState() {
    const state = read();
    return {
      ...state,
      todayCount: state.history.filter((h) => isToday(h.timestamp)).length,
    };
  },
  addArmario: (n) =>
    mutate((s) => {
      n = name(n);
      unique(s.armarios, n);
      const item = { id: uid(), name: n };
      s.armarios.push(item);
      return item;
    }),
  renameArmario: (id, n) =>
    mutate((s) => {
      n = name(n);
      unique(s.armarios, n, id);
      find(s.armarios, id).name = n;
    }),
  deleteArmario: (id) =>
    mutate((s) => {
      find(s.armarios, id);
      if (s.prateleiras.some((p) => p.armarioId === id))
        throw new Error("Remova as prateleiras deste armário primeiro.");
      s.armarios = s.armarios.filter((x) => x.id !== id);
    }),
  addPrateleira: (n, armarioId) =>
    mutate((s) => {
      n = name(n);
      unique(s.prateleiras, n);
      if (armarioId) find(s.armarios, armarioId);
      const item = { id: uid(), name: n, armarioId };
      s.prateleiras.push(item);
      return item;
    }),
  renamePrateleira: (id, n) =>
    mutate((s) => {
      n = name(n);
      unique(s.prateleiras, n, id);
      find(s.prateleiras, id).name = n;
    }),
  deletePrateleira: (id) =>
    mutate((s) => {
      find(s.prateleiras, id);
      if (s.products.some((p) => p.prateleiraId === id))
        throw new Error("Remova os produtos desta prateleira primeiro.");
      s.prateleiras = s.prateleiras.filter((x) => x.id !== id);
    }),
  addProduct: (p) =>
    mutate((s) => {
      find(s.prateleiras, p.prateleiraId);
      number(p.unitWeight, 0.001);
      number(p.initialQty, 0, 1e6);
      number(p.minQuantity, 0, 1e6);
      const after = number(round(p.unitWeight * p.initialQty)),
        product = {
          id: uid(),
          name: name(p.name, 160),
          category: name(p.category, 80),
          prateleiraId: p.prateleiraId,
          unitWeight: p.unitWeight,
          minQuantity: p.minQuantity,
          currentWeight: 0,
          version: 1,
        };
      s.products.push(product);
      if (after) reading(s, product.id, after);
      return product;
    }),
  deleteProduct: (id) =>
    mutate((s) => {
      const p = find(s.products, id);
      if (p.currentWeight !== 0)
        throw new Error("Zere o estoque antes de remover o produto.");
      s.products = s.products.filter((p) => p.id !== id);
    }),
  registerReading: (id, weight, version) =>
    mutate((s) => reading(s, id, weight, version)),
  quickAdjust: (id, direction) =>
    mutate((s) => {
      if (![-1, 1].includes(direction)) throw new Error("Ajuste inválido.");
      const p = find(s.products, id);
      return reading(
        s,
        id,
        round(Math.max(0, p.currentWeight + direction * p.unitWeight)),
      );
    }),
  reset: () => mutate((s) => Object.assign(s, initial())),
};
