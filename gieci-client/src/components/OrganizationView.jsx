import { Plus, Archive, Layers, Trash2 } from "./Icons.jsx";
import EditableName from "./EditableName.jsx";
export default function OrganizationView({
  armarioById,
  armarios,
  deleteArmario,
  deletePrateleira,
  handleAddArmario,
  handleAddPrateleira,
  novaPrateleiraArmario,
  novaPrateleiraNome,
  novoArmarioNome,
  prateleiras,
  productsByPrateleira,
  renameArmario,
  renamePrateleira,
  setNovaPrateleiraArmario,
  setNovaPrateleiraNome,
  setNovoArmarioNome,
}) {
  return (
    <div className="g-org-grid">
      <div className="g-org-panel">
        <p className="g-org-title">
          <Archive size={16} />
          {" Arm\u00E1rios"}
        </p>
        <form className="g-org-form" onSubmit={handleAddArmario}>
          <input
            className="g-input g-extracted-5"
            type="text"
            maxLength={120}
            required
            placeholder="Nome do armário (ex: Câmara Fria 2)"
            value={novoArmarioNome}
            onChange={(e) => setNovoArmarioNome(e.target.value)}
          />
          <button
            type="submit"
            className="g-btn g-btn-primary g-btn-icon"
            aria-label="Adicionar armário"
          >
            <Plus size={15} />
          </button>
        </form>
        <div className="g-org-list">
          {armarios.length === 0 && (
            <div className="g-empty g-extracted-6">
              {"Nenhum arm\u00E1rio cadastrado."}
            </div>
          )}
          {armarios.map((a) => {
            const count = prateleiras.filter(
              (pr) => pr.armarioId === a.id,
            ).length;
            return (
              <div className="g-org-row" key={a.id}>
                <div className="g-org-row-main">
                  <EditableName
                    value={a.name}
                    onSave={(name) => renameArmario(a.id, name)}
                  />
                  <div className="g-org-row-sub">
                    {count} {count === 1 ? "prateleira" : "prateleiras"}
                  </div>
                </div>
                <button
                  className="g-icon-btn-danger"
                  disabled={count > 0}
                  title={
                    count > 0
                      ? "Remova as prateleiras deste armário primeiro"
                      : "Excluir armário"
                  }
                  onClick={() => deleteArmario(a.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="g-org-panel">
        <p className="g-org-title">
          <Layers size={16} />
          {" Prateleiras"}
        </p>
        <form className="g-org-form column" onSubmit={handleAddPrateleira}>
          <input
            className="g-input g-extracted-5"
            type="text"
            maxLength={120}
            required
            placeholder="Nome da prateleira (ex: Prateleira C1)"
            value={novaPrateleiraNome}
            onChange={(e) => setNovaPrateleiraNome(e.target.value)}
          />
          <select
            className="g-input g-extracted-5"
            value={novaPrateleiraArmario}
            onChange={(e) => setNovaPrateleiraArmario(e.target.value)}
          >
            <option value="">
              {"\u2014 Prateleira avulsa (sem arm\u00E1rio) \u2014"}
            </option>
            {armarios.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button type="submit" className="g-btn g-btn-primary g-btn-block">
            <Plus size={14} />
            {" Adicionar prateleira"}
          </button>
        </form>
        <div className="g-org-list">
          {prateleiras.length === 0 && (
            <div className="g-empty g-extracted-6">
              {"Nenhuma prateleira cadastrada."}
            </div>
          )}
          {prateleiras.map((pr) => {
            const count = (productsByPrateleira[pr.id] || []).length;
            const arm = pr.armarioId ? armarioById[pr.armarioId] : null;
            return (
              <div className="g-org-row" key={pr.id}>
                <div className="g-org-row-main">
                  <EditableName
                    value={pr.name}
                    onSave={(name) => renamePrateleira(pr.id, name)}
                  />
                  <div className="g-org-row-sub">
                    {arm ? arm.name : "Avulsa"}
                    {" \u00B7 "}
                    {count} {count === 1 ? "produto" : "produtos"}
                  </div>
                </div>
                <button
                  className="g-icon-btn-danger"
                  disabled={count > 0}
                  title={
                    count > 0
                      ? "Remova os produtos desta prateleira primeiro"
                      : "Excluir prateleira"
                  }
                  onClick={() => deletePrateleira(pr.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
