import { useCallback, useEffect, useRef, useState } from "react";
import { apiStore, isDemo } from "../services/api.js";

const empty = {
  armarios: [],
  prateleiras: [],
  products: [],
  history: [],
  todayCount: 0,
};
const getStore =
  import.meta.env.VITE_DATA_MODE === "demo"
    ? async () => (await import("../services/demoStore.js")).demoStore
    : async () => apiStore;
export default function useInventory() {
  const [data, setData] = useState(empty),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [lastSync, setLastSync] = useState(null),
    [revision, setRevision] = useState(0);
  const mounted = useRef(false),
    lock = useRef(false),
    generation = useRef(0),
    polling = useRef(false);
  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    try {
      const state = await (await getStore()).getState();
      if (mounted.current && ticket === generation.current) {
        setData({ ...empty, ...state });
        setLastSync(Date.now());
        setError("");
      }
      return true;
    } catch (err) {
      if (mounted.current && ticket === generation.current)
        setError(err.message);
      return false;
    } finally {
      if (mounted.current) setLoaded(true);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    refresh();
    const tick = async () => {
      if (lock.current || polling.current || document.hidden) return;
      polling.current = true;
      try {
        await refresh();
      } finally {
        polling.current = false;
      }
    };
    const timer = isDemo ? null : setInterval(tick, 5000);
    const changed = (e) => {
      if (e.key === "gieci-estoque-v1") tick();
    };
    window.addEventListener("storage", changed);
    window.addEventListener("online", tick);
    return () => {
      mounted.current = false;
      generation.current++;
      clearInterval(timer);
      window.removeEventListener("storage", changed);
      window.removeEventListener("online", tick);
    };
  }, [refresh]);
  const mutate = useCallback(
    async (method, ...args) => {
      if (lock.current) return { ok: false };
      lock.current = true;
      setPending(true);
      generation.current++;
      try {
        const store = await getStore();
        if (!store[method])
          throw new Error("Operação indisponível neste modo.");
        const result = await store[method](...args);
        if (mounted.current) setRevision((v) => v + 1);
        await refresh();
        return { ok: true, result };
      } catch (err) {
        if (err.status === 409) await refresh();
        return { ok: false, error: err.message };
      } finally {
        lock.current = false;
        if (mounted.current) setPending(false);
      }
    },
    [refresh],
  );
  return {
    ...data,
    loaded,
    error,
    pending,
    lastSync,
    revision,
    refresh,
    mutate,
    isDemo,
  };
}
