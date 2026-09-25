import { useEffect, useState, useCallback, useRef } from "react";
import { isDemo, request, rangeQuery } from "../services/api.js";

export function useReport(start, end, active, refreshKey) {
  const [state, setState] = useState({ rows: [], loading: false, error: "" });
  const startISO = start.toISOString(),
    endISO = end.toISOString();
  useEffect(() => {
    if (isDemo || !active) return;
    const controller = new AbortController();
    setState({ rows: [], loading: true, error: "" });
    request(`/relatorios?${rangeQuery(new Date(startISO), new Date(endISO))}`, {
      signal: controller.signal,
    })
      .then((result) =>
        setState({ rows: result.rows, loading: false, error: "" }),
      )
      .catch((err) => {
        if (err.name !== "AbortError")
          setState({ rows: [], loading: false, error: err.message });
      });
    return () => controller.abort();
  }, [startISO, endISO, active, refreshKey]);
  return state;
}
export function useHistory(productId, active, revision) {
  const [state, setState] = useState({
    items: [],
    nextCursor: null,
    loading: false,
    error: "",
  });
  const [reload, setReload] = useState(0),
    version = useRef(0),
    busy = useRef(false);
  const query =
    productId === "all" ? "" : `productId=${encodeURIComponent(productId)}&`;
  useEffect(() => {
    if (isDemo || !active) return;
    const controller = new AbortController();
    version.current++;
    setState({ items: [], nextCursor: null, loading: true, error: "" });
    request(`/historico?${query}limit=100`, { signal: controller.signal })
      .then((result) => setState({ ...result, loading: false, error: "" }))
      .catch((err) => {
        if (err.name !== "AbortError")
          setState({
            items: [],
            nextCursor: null,
            loading: false,
            error: err.message,
          });
      });
    return () => {
      version.current++;
      controller.abort();
    };
  }, [query, active, revision, reload]);
  const loadMore = useCallback(async () => {
    if (busy.current || !state.nextCursor) return;
    busy.current = true;
    const ticket = version.current;
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const result = await request(
        `/historico?${query}cursor=${state.nextCursor}&limit=100`,
      );
      if (ticket === version.current)
        setState((s) => ({
          ...result,
          items: [...s.items, ...result.items],
          loading: false,
          error: "",
        }));
    } catch (err) {
      if (ticket === version.current)
        setState((s) => ({ ...s, loading: false, error: err.message }));
    } finally {
      busy.current = false;
    }
  }, [query, state.nextCursor]);
  return { ...state, loadMore, refresh: () => setReload((v) => v + 1) };
}
