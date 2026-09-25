import { Archive, Boxes, Layers, Wifi, WifiOff } from "./Icons.jsx";
import { fmtTime } from "../utils/format.js";
export default function PanelView({
  armarios,
  autoSim,
  avulsasPrateleiras,
  countAvulsas,
  countInArmario,
  error,
  groupFilter,
  hasAvulsas,
  inventory,
  isDemo,
  lastSync,
  prateleiras,
  products,
  refresh,
  renderPrateleiraBlock,
  setActiveTab,
  setAutoSim,
  setGroupFilter,
  showAvulsas,
  visibleArmarios,
}) {
  return (
    <div>
      <div className="g-sync-bar">
        <div className="g-sync-status">
          <span
            className={`g-sync-dot ${(isDemo ? autoSim : !error) ? "online" : "offline"}`}
          />
          <div>
            <div className="g-sync-title">
              {isDemo
                ? autoSim
                  ? "Sensores conectados (simulado)"
                  : "Simulação manual"
                : error
                  ? "Servidor indisponível"
                  : "Estoque sincronizado com o servidor"}
            </div>
            <div className="g-sync-sub">
              {isDemo
                ? autoSim
                  ? lastSync
                    ? `Última sincronização: ${fmtTime(lastSync)}`
                    : "Aguardando a primeira leitura..."
                  : "Ative para simular leituras chegando automaticamente das balanças"
                : inventory.lastSync
                  ? `Última sincronização: ${fmtTime(inventory.lastSync)} · atualização a cada 5 s`
                  : "Aguardando o servidor..."}
            </div>
          </div>
        </div>
        {isDemo ? (
          <button
            className={`g-btn ${autoSim ? "" : "g-btn-primary"}`}
            onClick={() => setAutoSim((v) => !v)}
          >
            {autoSim ? (
              <>
                <WifiOff size={14} /> Desativar
              </>
            ) : (
              <>
                <Wifi size={14} /> Ativar simulação automática
              </>
            )}
          </button>
        ) : (
          <button className="g-btn" onClick={refresh}>
            Atualizar
          </button>
        )}
      </div>
      {(armarios.length > 0 || prateleiras.length > 0) && (
        <div className="g-nav-chips">
          <button
            className={`g-chip ${groupFilter === "all" ? "active" : ""}`}
            onClick={() => setGroupFilter("all")}
          >
            {"Todas ("}
            {products.length}
            {")"}
          </button>
          {armarios.map((a) => (
            <button
              key={a.id}
              className={`g-chip ${groupFilter === a.id ? "active" : ""}`}
              onClick={() => setGroupFilter(a.id)}
            >
              {a.name}
              {" ("}
              {countInArmario(a.id)}
              {")"}
            </button>
          ))}
          {hasAvulsas && (
            <button
              className={`g-chip ${groupFilter === "avulsas" ? "active" : ""}`}
              onClick={() => setGroupFilter("avulsas")}
            >
              {"Prateleiras Avulsas ("}
              {countAvulsas}
              {")"}
            </button>
          )}
        </div>
      )}
      {armarios.length === 0 && prateleiras.length === 0 && (
        <div className="g-empty">
          {"Nenhum arm\u00E1rio ou prateleira cadastrado ainda."}
          <br />
          <button
            className="g-btn g-btn-primary g-extracted-7"
            onClick={() => setActiveTab("organizacao")}
          >
            <Archive size={14} />
            {" Organizar prateleiras e arm\u00E1rios"}
          </button>
        </div>
      )}
      {visibleArmarios.map((armario) => {
        const prateleirasDoArmario = prateleiras.filter(
          (pr) => pr.armarioId === armario.id,
        );
        return (
          <div className="g-armario-block" key={armario.id}>
            <div className="g-armario-header">
              <Archive size={17} /> {armario.name}
            </div>
            {prateleirasDoArmario.length === 0 ? (
              <div className="g-prateleira-empty">
                {
                  "Este arm\u00E1rio ainda n\u00E3o tem prateleiras cadastradas."
                }
                <button
                  className="g-btn"
                  onClick={() => setActiveTab("organizacao")}
                >
                  <Layers size={13} />
                  {" Adicionar prateleira"}
                </button>
              </div>
            ) : (
              prateleirasDoArmario.map((pr) => renderPrateleiraBlock(pr))
            )}
          </div>
        );
      })}
      {showAvulsas && avulsasPrateleiras.length > 0 && (
        <div className="g-armario-block">
          <div className="g-armario-header">
            <Boxes size={17} />
            {" Prateleiras Avulsas"}
          </div>
          {avulsasPrateleiras.map((pr) => renderPrateleiraBlock(pr))}
        </div>
      )}
    </div>
  );
}
