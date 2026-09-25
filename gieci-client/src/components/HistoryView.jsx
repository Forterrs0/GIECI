import { TrendingUp, TrendingDown } from "./Icons.jsx";
import { fmtWeight, fmtDateTime } from "../utils/format.js";
export default function HistoryView({
  filteredHistory,
  historyFilter,
  historyLocationById,
  isDemo,
  products,
  remoteHistory,
  setHistoryFilter,
}) {
  return (
    <div>
      <div className="g-filter-row">
        <select
          className="g-input g-extracted-4"
          value={historyFilter}
          onChange={(e) => setHistoryFilter(e.target.value)}
        >
          <option value="all">{"Todos os produtos"}</option>
          {products.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {!isDemo && (
        <div className="g-query-tools">
          <button
            className="g-btn"
            onClick={remoteHistory.refresh}
            disabled={remoteHistory.loading}
          >
            Atualizar histórico
          </button>
          {remoteHistory.loading && <span role="status">Carregando...</span>}
          {remoteHistory.error && (
            <span role="alert">{remoteHistory.error}</span>
          )}
        </div>
      )}
      <div className="g-history-list">
        {filteredHistory.length === 0 &&
          !remoteHistory.loading &&
          !remoteHistory.error && (
            <div className="g-empty">
              {"Nenhuma movimenta\u00E7\u00E3o registrada ainda."}
            </div>
          )}
        {filteredHistory.map((h) => (
          <div className="g-history-row" key={h.id}>
            <div className={`g-history-icon ${h.type}`}>
              {h.type === "saida" ? (
                <TrendingDown size={16} />
              ) : (
                <TrendingUp size={16} />
              )}
            </div>
            <div className="g-history-main">
              <div className="g-history-name">
                {h.productName}
                {" \u2014 "}
                {h.type === "saida" ? "retirada" : "adição"}
                {" de"} {h.quantityChanged}
                {" unid."}
              </div>
              <div className="g-history-sub">
                {fmtWeight(h.weightBefore)}
                {" \u2192 "}
                {fmtWeight(h.weightAfter)}
                {historyLocationById[h.productId]
                  ? ` · ${historyLocationById[h.productId]}`
                  : ""}
              </div>
            </div>
            <div className="g-history-time">{fmtDateTime(h.timestamp)}</div>
          </div>
        ))}
      </div>
      {!isDemo && remoteHistory.nextCursor && (
        <button
          className="g-btn g-load-more"
          onClick={remoteHistory.loadMore}
          disabled={remoteHistory.loading}
        >
          Carregar mais movimentações
        </button>
      )}
    </div>
  );
}
