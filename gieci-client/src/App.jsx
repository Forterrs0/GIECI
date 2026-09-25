import ReportsView from "./components/ReportsView.jsx";
import HistoryView from "./components/HistoryView.jsx";
import ProductForm from "./components/ProductForm.jsx";
import OrganizationView from "./components/OrganizationView.jsx";
import PanelView from "./components/PanelView.jsx";
import ShelfBlock from "./components/ShelfBlock.jsx";
import ProductCard from "./components/ProductCard.jsx";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Scale,
  Plus,
  Minus,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  Archive,
  Boxes,
  Layers,
  Trash2,
  Pencil,
  Wifi,
  WifiOff,
  BarChart3,
} from "./components/Icons.jsx";
import EditableName from "./components/EditableName.jsx";
import { CATEGORIAS } from "./data/categories.js";
import {
  qtyOf,
  statusOf,
  fmtWeight,
  fmtQty,
  fmtDateTime,
  fmtTime,
  isToday,
  getPeriodRange,
  shiftDate,
  fmtPeriodLabel,
} from "./utils/format.js";
import useInventory from "./hooks/useInventory.js";
import { useHistory, useReport } from "./hooks/useQueries.js";
export default function App({ user, onLogout }) {
  async function perform(method, ...args) {
    if (error) {
      setToast({
        text: "Atualize a conexão antes de alterar o estoque.",
        kind: "saida",
      });
      return {
        ok: false,
      };
    }
    const result = await mutate(method, ...args);
    if (result.error)
      setToast({
        text: result.error,
        kind: "saida",
      });
    return result;
  }
  function showMovement(result) {
    if (!result) return;
    if (result.ignorada) {
      setToast({
        text: "Peso sem alteração.",
        kind: "entrada",
      });
      return;
    }
    setToast({
      text:
        result.produto +
        ": " +
        (result.movimentacao === "SAIDA" ? "retirada" : "adição") +
        " de " +
        result.quantidade +
        " unid. registrada",
      kind: result.movimentacao === "SAIDA" ? "saida" : "entrada",
    });
  }
  async function deleteProduct(product) {
    if (
      !window.confirm(
        "Remover " + product.name + "? O histórico será preservado.",
      )
    )
      return;
    if ((await perform("deleteProduct", product.id)).ok) {
      setOpenSimulateId(null);
      setToast({
        text: "Produto removido. Histórico preservado.",
        kind: "entrada",
      });
    }
  }
  const inventory = useInventory();
  const {
    armarios,
    prateleiras,
    products,
    loaded,
    error,
    pending,
    mutate,
    refresh,
    isDemo,
  } = inventory;
  const [activeTab, setActiveTab] = useState("painel");
  const [groupFilter, setGroupFilter] = useState("all");
  const [openSimulateId, setOpenSimulateId] = useState(null);
  const [manualInputs, setManualInputs] = useState({});
  const [toast, setToast] = useState(null);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [form, setForm] = useState({
    name: "",
    category: CATEGORIAS[0],
    prateleiraId: "",
    unitWeight: "",
    initialQty: "",
    minQuantity: "",
  });
  const [novoArmarioNome, setNovoArmarioNome] = useState("");
  const [novaPrateleiraNome, setNovaPrateleiraNome] = useState("");
  const [novaPrateleiraArmario, setNovaPrateleiraArmario] = useState("");
  const [autoSim, setAutoSim] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("dia");
  const [reportRefDate, setReportRefDate] = useState(() => new Date());
  const productsRef = useRef(products);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  // Mantém uma referência sempre atualizada dos produtos para o simulador automático.
  useEffect(() => {
    productsRef.current = products;
  }, [products]);
  // Quando a simulação automática está ativada, imita leituras periódicas chegando dos sensores.
  useEffect(() => {
    if (!autoSim) return;
    const interval = setInterval(() => {
      setLastSync(Date.now());
      const current = productsRef.current;
      if (!current || current.length === 0) return;
      if (Math.random() < 0.35) {
        const product = current[Math.floor(Math.random() * current.length)];
        const currentQty = product.currentWeight / product.unitWeight;
        let removal = Math.random() < 0.7;
        if (removal && currentQty < 1) removal = false;
        const direction = removal ? -1 : 1;
        const targetWeight = Math.max(
          0,
          product.currentWeight + direction * product.unitWeight,
        );
        registerReading(product.id, targetWeight);
      }
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSim]);
  const remoteHistory = useHistory(
    historyFilter,
    activeTab === "historico",
    inventory.revision,
  );
  const history = isDemo ? inventory.history : remoteHistory.items;
  const stats = useMemo(() => {
    const totalWeight = products.reduce((s, p) => s + p.currentWeight, 0);
    const alertCount = products.filter((p) => statusOf(p).key !== "ok").length;
    const todayCount = inventory.todayCount;
    return {
      totalProducts: products.length,
      totalWeight,
      alertCount,
      todayCount,
    };
  }, [products, inventory.todayCount]);
  const prateleiraById = useMemo(
    () => Object.fromEntries(prateleiras.map((p) => [p.id, p])),
    [prateleiras],
  );
  const armarioById = useMemo(
    () => Object.fromEntries(armarios.map((a) => [a.id, a])),
    [armarios],
  );
  const productsByPrateleira = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      if (!map[p.prateleiraId]) map[p.prateleiraId] = [];
      map[p.prateleiraId].push(p);
    });
    return map;
  }, [products]);
  function locationLabelFor(prateleiraId) {
    const pr = prateleiraById[prateleiraId];
    if (!pr) return null;
    const arm = pr.armarioId ? armarioById[pr.armarioId] : null;
    return arm ? `${arm.name} › ${pr.name}` : pr.name;
  }
  const historyLocationById = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[p.id] = locationLabelFor(p.prateleiraId);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, prateleiraById, armarioById]);
  const reportRange = useMemo(
    () => getPeriodRange(reportPeriod, reportRefDate),
    [reportPeriod, reportRefDate],
  );
  const remoteReport = useReport(
    reportRange.start,
    reportRange.end,
    activeTab === "relatorios",
    inventory.lastSync,
  );
  const reportMovements = useMemo(() => {
    const startMs = reportRange.start.getTime();
    const endMs = reportRange.end.getTime();
    return history.filter(
      (h) => h.timestamp >= startMs && h.timestamp <= endMs,
    );
  }, [history, reportRange]);
  const reportRows = useMemo(() => {
    const map = {};
    reportMovements.forEach((h) => {
      if (!map[h.productId]) {
        map[h.productId] = {
          productId: h.productId,
          productName: h.productName,
          saidaQty: 0,
          entradaQty: 0,
          saidaWeight: 0,
          entradaWeight: 0,
        };
      }
      const row = map[h.productId];
      const weightDelta = Math.abs(h.weightAfter - h.weightBefore);
      if (h.type === "saida") {
        row.saidaQty = Math.round((row.saidaQty + h.quantityChanged) * 10) / 10;
        row.saidaWeight += weightDelta;
      } else {
        row.entradaQty =
          Math.round((row.entradaQty + h.quantityChanged) * 10) / 10;
        row.entradaWeight += weightDelta;
      }
    });
    return (isDemo ? Object.values(map) : remoteReport.rows)
      .map((row) => {
        const product = products.find((p) => p.id === row.productId);
        return {
          ...row,
          productName: product ? product.name : row.productName,
          category: product ? product.category : null,
          location: product ? locationLabelFor(product.prateleiraId) : null,
          currentWeight: product ? product.currentWeight : null,
          currentQty: product ? fmtQty(product) : null,
          status: product ? statusOf(product) : null,
          exists: !!product,
        };
      })
      .sort((a, b) => b.saidaWeight - a.saidaWeight);
  }, [
    reportMovements,
    products,
    remoteReport.rows,
    isDemo,
    prateleiraById,
    armarioById,
  ]);
  const reportTotals = useMemo(() => {
    let totalSaidaWeight = 0;
    let totalEntradaWeight = 0;
    reportMovements.forEach((h) => {
      const weightDelta = Math.abs(h.weightAfter - h.weightBefore);
      if (h.type === "saida") totalSaidaWeight += weightDelta;
      else totalEntradaWeight += weightDelta;
    });
    if (!isDemo) {
      totalSaidaWeight = remoteReport.rows.reduce(
        (sum, r) => sum + r.saidaWeight,
        0,
      );
      totalEntradaWeight = remoteReport.rows.reduce(
        (sum, r) => sum + r.entradaWeight,
        0,
      );
    }
    const estoqueAtualTotal = products.reduce((s, p) => s + p.currentWeight, 0);
    return {
      totalSaidaWeight,
      totalEntradaWeight,
      saldo: totalEntradaWeight - totalSaidaWeight,
      estoqueAtualTotal,
    };
  }, [reportMovements, products, remoteReport.rows, isDemo]);
  if (!loaded) {
    return (
      <div className="g-extracted-1">
        <Scale size={26} className="g-extracted-2" />
        <span className="g-extracted-3">
          {"Carregando dados do estoque..."}
        </span>
      </div>
    );
  }
  const avulsasPrateleiras = prateleiras.filter((pr) => !pr.armarioId);
  const hasAvulsas = avulsasPrateleiras.length > 0;
  const showAvulsas = groupFilter === "all" || groupFilter === "avulsas";
  const visibleArmarios =
    groupFilter === "all"
      ? armarios
      : groupFilter === "avulsas"
        ? []
        : armarios.filter((a) => a.id === groupFilter);
  function countInArmario(armarioId) {
    return prateleiras
      .filter((pr) => pr.armarioId === armarioId)
      .reduce((sum, pr) => {
        var _a;
        return (
          sum +
          (((_a = productsByPrateleira[pr.id]) === null || _a === void 0
            ? void 0
            : _a.length) || 0)
        );
      }, 0);
  }
  const countAvulsas = avulsasPrateleiras.reduce((sum, pr) => {
    var _a;
    return (
      sum +
      (((_a = productsByPrateleira[pr.id]) === null || _a === void 0
        ? void 0
        : _a.length) || 0)
    );
  }, 0);
  async function registerReading(productId, newWeight) {
    const p = productsRef.current.find((p) => p.id === productId);
    if (!p) return false;
    const result = await perform(
      "registerReading",
      productId,
      newWeight,
      p.version,
    );
    if (result.ok) {
      showMovement(result.result);
      setOpenSimulateId(null);
      return true;
    }
    return false;
  }
  async function quickAdjust(product, direction) {
    const result = await perform("quickAdjust", product.id, direction);
    if (result.ok) showMovement(result.result);
  }
  async function submitManual(product) {
    const raw = manualInputs[product.id];
    const value = Number(raw);
    if (
      raw === undefined ||
      raw.trim() === "" ||
      !Number.isFinite(value) ||
      value < 0
    ) {
      setToast({
        text: "Informe um peso válido em gramas.",
        kind: "saida",
      });
      return;
    }
    if (await registerReading(product.id, value))
      setManualInputs((prev) => ({
        ...prev,
        [product.id]: "",
      }));
  }
  function goAddProduct(prateleiraId) {
    setForm((f) => ({
      ...f,
      prateleiraId,
    }));
    setActiveTab("adicionar");
  }
  async function handleAddProduct(e) {
    e.preventDefault();
    const data = {
      name: form.name.trim(),
      category: form.category,
      prateleiraId: form.prateleiraId,
      unitWeight: Number(form.unitWeight),
      initialQty: Number(form.initialQty),
      minQuantity: Number(form.minQuantity),
    };
    if (
      !data.name ||
      !data.prateleiraId ||
      form.unitWeight.trim() === "" ||
      form.initialQty.trim() === "" ||
      form.minQuantity.trim() === "" ||
      ![data.unitWeight, data.initialQty, data.minQuantity].every(
        Number.isFinite,
      ) ||
      data.unitWeight <= 0 ||
      data.initialQty < 0 ||
      data.minQuantity < 0
    ) {
      setToast({
        text: "Preencha corretamente todos os campos do produto.",
        kind: "saida",
      });
      return;
    }
    const result = await perform("addProduct", data);
    if (result.ok) {
      setForm({
        name: "",
        category: CATEGORIAS[0],
        prateleiraId: "",
        unitWeight: "",
        initialQty: "",
        minQuantity: "",
      });
      setToast({
        text: data.name + " cadastrado com sucesso",
        kind: "entrada",
      });
      setGroupFilter("all");
      setActiveTab("painel");
    }
  }
  async function addArmario(name) {
    return perform("addArmario", name);
  }
  async function renameArmario(id, name) {
    return (await perform("renameArmario", id, name)).ok;
  }
  async function deleteArmario(id) {
    const result = await perform("deleteArmario", id);
    if (result.ok) setGroupFilter((prev) => (prev === id ? "all" : prev));
  }
  async function addPrateleira(name, armarioId) {
    return perform("addPrateleira", name, armarioId);
  }
  async function renamePrateleira(id, name) {
    return (await perform("renamePrateleira", id, name)).ok;
  }
  async function deletePrateleira(id) {
    await perform("deletePrateleira", id);
  }
  async function handleAddArmario(e) {
    e.preventDefault();
    if ((await addArmario(novoArmarioNome)).ok) {
      setNovoArmarioNome("");
      setToast({
        text: "Armário cadastrado.",
        kind: "entrada",
      });
    }
  }
  async function handleAddPrateleira(e) {
    e.preventDefault();
    if (
      (await addPrateleira(novaPrateleiraNome, novaPrateleiraArmario || null))
        .ok
    ) {
      setNovaPrateleiraNome("");
      setNovaPrateleiraArmario("");
      setToast({
        text: "Prateleira cadastrada.",
        kind: "entrada",
      });
    }
  }
  async function handleResetData() {
    if (!isDemo) return;
    setAutoSim(false);
    if ((await perform("reset")).ok) {
      setConfirmingReset(false);
      setGroupFilter("all");
      setHistoryFilter("all");
      setForm((f) => ({
        ...f,
        prateleiraId: "",
      }));
      setToast({
        text: "Dados de demonstração restaurados.",
        kind: "entrada",
      });
    }
  }
  function renderProductCard(product) {
    return (
      <ProductCard
        product={product}
        deleteProduct={deleteProduct}
        isDemo={isDemo}
        manualInputs={manualInputs}
        openSimulateId={openSimulateId}
        quickAdjust={quickAdjust}
        setManualInputs={setManualInputs}
        setOpenSimulateId={setOpenSimulateId}
        submitManual={submitManual}
      />
    );
  }
  function renderPrateleiraBlock(pr) {
    return (
      <ShelfBlock
        pr={pr}
        goAddProduct={goAddProduct}
        productsByPrateleira={productsByPrateleira}
        renderProductCard={renderProductCard}
      />
    );
  }
  const previewWeight =
    parseFloat(form.unitWeight) > 0 && parseFloat(form.initialQty) >= 0
      ? parseFloat(form.unitWeight) * parseFloat(form.initialQty)
      : 0;
  const filteredHistory =
    historyFilter === "all"
      ? history
      : history.filter((h) => String(h.productId) === historyFilter);
  return (
    <div className="gieci-app">
      <div className="g-header">
        <div className="g-brand">
          <div className="g-brand-icon">
            <Scale size={22} />
          </div>
          <div>
            <p className="g-brand-title">{"GIECI"}</p>
            <p className="g-brand-sub">
              {"Gest\u00E3o Inteligente de Estoque para Cozinhas Industriais"}
            </p>
          </div>
        </div>
        {!isDemo && (
          <div className="g-session-controls">
            <span>{user?.name}</span>
            <button className="g-btn" onClick={onLogout}>
              Sair
            </button>
          </div>
        )}
      </div>
      <div className="g-stats">
        <div className="g-stat-card">
          <div className="g-stat-label">{"Produtos monitorados"}</div>
          <div className="g-led">
            <span className="g-led-num">{stats.totalProducts}</span>
            <span className="g-led-unit">{"itens"}</span>
          </div>
        </div>
        <div className="g-stat-card">
          <div className="g-stat-label">{"Peso total em estoque"}</div>
          <div className="g-led">
            <span className="g-led-num">
              {(stats.totalWeight / 1000).toFixed(1)}
            </span>
            <span className="g-led-unit">{"kg"}</span>
          </div>
        </div>
        <div className="g-stat-card">
          <div className="g-stat-label">{"Itens em alerta"}</div>
          <div className="g-led">
            <span
              className={`g-led-num ${stats.alertCount > 0 ? "amber" : ""}`}
            >
              {stats.alertCount}
            </span>
            <span className="g-led-unit">{"itens"}</span>
          </div>
        </div>
        <div className="g-stat-card">
          <div className="g-stat-label">{"Movimenta\u00E7\u00F5es hoje"}</div>
          <div className="g-led">
            <span className="g-led-num">{stats.todayCount}</span>
            <span className="g-led-unit">{"registros"}</span>
          </div>
        </div>
      </div>
      <div className="g-tabs">
        <button
          className={`g-tab ${activeTab === "painel" ? "active" : ""}`}
          onClick={() => setActiveTab("painel")}
        >
          <LayoutGrid size={15} />
          {" Painel de Prateleiras"}
        </button>
        <button
          className={`g-tab ${activeTab === "organizacao" ? "active" : ""}`}
          onClick={() => setActiveTab("organizacao")}
        >
          <Archive size={15} />
          {" Arm\u00E1rios & Prateleiras"}
        </button>
        <button
          className={`g-tab ${activeTab === "adicionar" ? "active" : ""}`}
          onClick={() => setActiveTab("adicionar")}
        >
          <Plus size={15} />
          {" Cadastrar Produto"}
        </button>
        <button
          className={`g-tab ${activeTab === "historico" ? "active" : ""}`}
          onClick={() => setActiveTab("historico")}
        >
          <History size={15} />
          {" Hist\u00F3rico"}
        </button>
        <button
          className={`g-tab ${activeTab === "relatorios" ? "active" : ""}`}
          onClick={() => setActiveTab("relatorios")}
        >
          <BarChart3 size={15} />
          {" Relat\u00F3rios"}
        </button>
      </div>
      {error && (
        <div className="g-notice" role="alert">
          {error}{" "}
          <button className="g-btn" onClick={refresh}>
            Tentar novamente
          </button>
        </div>
      )}
      {pending && (
        <div className="g-save-status" role="status">
          Salvando alteração...
        </div>
      )}
      <div className="g-main" aria-busy={pending}>
        <fieldset className="g-work-area" disabled={pending || !!error}>
          {activeTab === "painel" && (
            <PanelView
              armarios={armarios}
              autoSim={autoSim}
              avulsasPrateleiras={avulsasPrateleiras}
              countAvulsas={countAvulsas}
              countInArmario={countInArmario}
              error={error}
              groupFilter={groupFilter}
              hasAvulsas={hasAvulsas}
              inventory={inventory}
              isDemo={isDemo}
              lastSync={lastSync}
              prateleiras={prateleiras}
              products={products}
              refresh={refresh}
              renderPrateleiraBlock={renderPrateleiraBlock}
              setActiveTab={setActiveTab}
              setAutoSim={setAutoSim}
              setGroupFilter={setGroupFilter}
              showAvulsas={showAvulsas}
              visibleArmarios={visibleArmarios}
            />
          )}
          {activeTab === "organizacao" && (
            <OrganizationView
              armarioById={armarioById}
              armarios={armarios}
              deleteArmario={deleteArmario}
              deletePrateleira={deletePrateleira}
              handleAddArmario={handleAddArmario}
              handleAddPrateleira={handleAddPrateleira}
              novaPrateleiraArmario={novaPrateleiraArmario}
              novaPrateleiraNome={novaPrateleiraNome}
              novoArmarioNome={novoArmarioNome}
              prateleiras={prateleiras}
              productsByPrateleira={productsByPrateleira}
              renameArmario={renameArmario}
              renamePrateleira={renamePrateleira}
              setNovaPrateleiraArmario={setNovaPrateleiraArmario}
              setNovaPrateleiraNome={setNovaPrateleiraNome}
              setNovoArmarioNome={setNovoArmarioNome}
            />
          )}
          {activeTab === "adicionar" && (
            <ProductForm
              armarios={armarios}
              avulsasPrateleiras={avulsasPrateleiras}
              form={form}
              handleAddProduct={handleAddProduct}
              locationLabelFor={locationLabelFor}
              prateleiras={prateleiras}
              previewWeight={previewWeight}
              setActiveTab={setActiveTab}
              setForm={setForm}
            />
          )}
          {activeTab === "historico" && (
            <HistoryView
              filteredHistory={filteredHistory}
              historyFilter={historyFilter}
              historyLocationById={historyLocationById}
              isDemo={isDemo}
              products={products}
              remoteHistory={remoteHistory}
              setHistoryFilter={setHistoryFilter}
            />
          )}
          {activeTab === "relatorios" && (
            <ReportsView
              isDemo={isDemo}
              remoteReport={remoteReport}
              reportPeriod={reportPeriod}
              reportRange={reportRange}
              reportRows={reportRows}
              reportTotals={reportTotals}
              setReportPeriod={setReportPeriod}
              setReportRefDate={setReportRefDate}
            />
          )}
        </fieldset>
      </div>
      <div className="g-footer">
        <span className="g-footer-note">
          {isDemo
            ? "Demonstração: os dados são salvos neste navegador."
            : "Dados salvos no servidor; alterações exigem uma sessão autenticada."}
        </span>
        {isDemo &&
          (!confirmingReset ? (
            <button
              className="g-footer-link"
              onClick={() => setConfirmingReset(true)}
            >
              {"Restaurar dados de exemplo"}
            </button>
          ) : (
            <span className="g-footer-confirm">
              {"Apagar tudo e voltar ao exemplo?"}
              <button
                className="g-footer-link danger"
                onClick={handleResetData}
              >
                {"Sim, restaurar"}
              </button>
              <button
                className="g-footer-link"
                onClick={() => setConfirmingReset(false)}
              >
                {"Cancelar"}
              </button>
            </span>
          ))}
      </div>
      {toast && (
        <div
          className={`g-toast ${toast.kind}`}
          role="status"
          aria-live="polite"
        >
          {toast.kind === "saida" ? (
            <TrendingDown size={15} />
          ) : (
            <TrendingUp size={15} />
          )}
          {toast.text}
        </div>
      )}
    </div>
  );
}
