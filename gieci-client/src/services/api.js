export const isDemo = import.meta.env.VITE_DATA_MODE === "demo";
let csrfToken = "";
export function setCsrfToken(value) {
  csrfToken = value || "";
}
export async function request(path, { method = "GET", body, signal } = {}) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(cancel, 12000);
  try {
    const headers = { Accept: "application/json" };
    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
      headers["X-CSRF-Token"] = csrfToken;
    }
    const response = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: "same-origin",
      signal: controller.signal,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const result =
      response.status === 204
        ? null
        : await response.json().catch(() => {
            throw new Error(
              "Resposta inválida do servidor. Confira a configuração da API.",
            );
          });
    if (!response.ok) {
      const error = new Error(
        result?.error || "Não foi possível concluir a operação.",
      );
      error.status = response.status;
      if (response.status === 401 && !path.startsWith("/auth/"))
        window.dispatchEvent(new Event("gieci:session-expired"));
      throw error;
    }
    return result;
  } catch (error) {
    if (error.name === "AbortError") {
      if (signal?.aborted) throw error;
      throw new Error(
        "Tempo de resposta excedido. Atualize os dados antes de repetir a operação.",
      );
    }
    if (error instanceof TypeError)
      throw new Error(
        "Sem conexão com o servidor. Verifique sua rede e tente novamente.",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}
export const rangeQuery = (start, end) =>
  new URLSearchParams({
    inicio: start.toISOString(),
    fim: end.toISOString(),
  }).toString();
export const apiStore = {
  async getState() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setMilliseconds(-1);
    return request(`/estado?${rangeQuery(start, end)}`);
  },
  addArmario: (name) =>
    request("/armarios", { method: "POST", body: { name } }),
  renameArmario: (id, name) =>
    request(`/armarios/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { name },
    }),
  deleteArmario: (id) =>
    request(`/armarios/${encodeURIComponent(id)}`, { method: "DELETE" }),
  addPrateleira: (name, armarioId) =>
    request("/prateleiras", { method: "POST", body: { name, armarioId } }),
  renamePrateleira: (id, name) =>
    request(`/prateleiras/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { name },
    }),
  deletePrateleira: (id) =>
    request(`/prateleiras/${encodeURIComponent(id)}`, { method: "DELETE" }),
  addProduct: (data) => request("/produtos", { method: "POST", body: data }),
  deleteProduct: (id) =>
    request(`/produtos/${encodeURIComponent(id)}`, { method: "DELETE" }),
  registerReading: (id, weight, expectedVersion) =>
    request(`/produtos/${encodeURIComponent(id)}/leitura`, {
      method: "POST",
      body: { weight, expectedVersion },
    }),
  quickAdjust: (id, deltaUnits) =>
    request(`/produtos/${encodeURIComponent(id)}/ajuste`, {
      method: "POST",
      body: { deltaUnits },
    }),
};
