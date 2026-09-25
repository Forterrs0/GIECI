import React from "react";
import { ChevronLeft, ChevronRight } from "./Icons.jsx";
import { fmtWeight, shiftDate, fmtPeriodLabel } from "../utils/format.js";
export default function ReportsView({
  isDemo,
  remoteReport,
  reportPeriod,
  reportRange,
  reportRows,
  reportTotals,
  setReportPeriod,
  setReportRefDate,
}) {
  return (
    <div>
      {!isDemo && remoteReport.loading && (
        <p role="status">Carregando relatório...</p>
      )}
      {!isDemo && remoteReport.error && (
        <p role="alert">{remoteReport.error}</p>
      )}
      <div className="g-report-controls">
        <div className="g-nav-chips g-extracted-8">
          <button
            className={`g-chip ${reportPeriod === "dia" ? "active" : ""}`}
            onClick={() => setReportPeriod("dia")}
          >
            {"Dia"}
          </button>
          <button
            className={`g-chip ${reportPeriod === "semana" ? "active" : ""}`}
            onClick={() => setReportPeriod("semana")}
          >
            {"Semana"}
          </button>
          <button
            className={`g-chip ${reportPeriod === "mes" ? "active" : ""}`}
            onClick={() => setReportPeriod("mes")}
          >
            {"M\u00EAs"}
          </button>
        </div>
        <div className="g-report-nav">
          <button
            className="g-btn g-btn-icon"
            title="Período anterior"
            onClick={() =>
              setReportRefDate((d) => shiftDate(reportPeriod, d, -1))
            }
          >
            <ChevronLeft size={16} />
          </button>
          <span className="g-report-period-label">
            {fmtPeriodLabel(reportPeriod, reportRange)}
          </span>
          <button
            className="g-btn g-btn-icon"
            title="Próximo período"
            onClick={() =>
              setReportRefDate((d) => shiftDate(reportPeriod, d, 1))
            }
          >
            <ChevronRight size={16} />
          </button>
          <button
            className="g-btn"
            onClick={() => setReportRefDate(new Date())}
          >
            {"Hoje"}
          </button>
        </div>
      </div>
      <div className="g-stats g-extracted-9">
        <div className="g-stat-card">
          <div className="g-stat-label">{"Total retirado no per\u00EDodo"}</div>
          <div className="g-led">
            <span className="g-led-num red">
              {(reportTotals.totalSaidaWeight / 1000).toFixed(1)}
            </span>
            <span className="g-led-unit">{"kg"}</span>
          </div>
        </div>
        <div className="g-stat-card">
          <div className="g-stat-label">
            {"Total adicionado no per\u00EDodo"}
          </div>
          <div className="g-led">
            <span className="g-led-num">
              {(reportTotals.totalEntradaWeight / 1000).toFixed(1)}
            </span>
            <span className="g-led-unit">{"kg"}</span>
          </div>
        </div>
        <div className="g-stat-card">
          <div className="g-stat-label">{"Saldo do per\u00EDodo"}</div>
          <div className="g-led">
            <span
              className={`g-led-num ${reportTotals.saldo < 0 ? "red" : ""}`}
            >
              {reportTotals.saldo > 0 ? "+" : ""}
              {(reportTotals.saldo / 1000).toFixed(1)}
            </span>
            <span className="g-led-unit">{"kg"}</span>
          </div>
        </div>
        <div className="g-stat-card">
          <div className="g-stat-label">{"Estoque atual (hoje)"}</div>
          <div className="g-led">
            <span className="g-led-num">
              {(reportTotals.estoqueAtualTotal / 1000).toFixed(1)}
            </span>
            <span className="g-led-unit">{"kg"}</span>
          </div>
        </div>
      </div>
      {!isDemo &&
      (remoteReport.loading ||
        remoteReport.error) ? null : reportRows.length === 0 ? (
        <div className="g-empty">
          {"Nenhuma movimenta\u00E7\u00E3o registrada neste per\u00EDodo."}
        </div>
      ) : (
        <div className="g-table-wrap">
          <table className="g-report-table">
            <thead>
              <tr>
                <th>{"Produto"}</th>
                <th>{"Retirado"}</th>
                <th>{"Adicionado"}</th>
                <th>{"Estoque atual"}</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((r) => (
                <tr key={r.productId}>
                  <td>
                    <div className="g-report-name">{r.productName}</div>
                    <div className="g-report-sub">
                      {r.category && r.location
                        ? `${r.category} · ${r.location}`
                        : "—"}
                    </div>
                  </td>
                  <td>
                    {r.saidaWeight > 0 ? (
                      <React.Fragment>
                        <div className="g-report-num saida">
                          {"-"}
                          {r.saidaQty}
                          {" unid."}
                        </div>
                        <div className="g-report-sub">
                          {fmtWeight(r.saidaWeight)}
                        </div>
                      </React.Fragment>
                    ) : (
                      <span className="g-report-sub">{"\u2014"}</span>
                    )}
                  </td>
                  <td>
                    {r.entradaWeight > 0 ? (
                      <React.Fragment>
                        <div className="g-report-num entrada">
                          {"+"}
                          {r.entradaQty}
                          {" unid."}
                        </div>
                        <div className="g-report-sub">
                          {fmtWeight(r.entradaWeight)}
                        </div>
                      </React.Fragment>
                    ) : (
                      <span className="g-report-sub">{"\u2014"}</span>
                    )}
                  </td>
                  <td>
                    {r.exists ? (
                      <React.Fragment>
                        <div className="g-report-num">
                          {r.currentQty}
                          {" unid."}
                        </div>
                        <div className="g-report-sub">
                          {fmtWeight(r.currentWeight)}
                        </div>
                        {r.status && (
                          <span
                            className={
                              `g-badge ${r.status.key}` + " g-extracted-10"
                            }
                          >
                            {r.status.label}
                          </span>
                        )}
                      </React.Fragment>
                    ) : (
                      <span className="g-report-sub">{"produto removido"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
