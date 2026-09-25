import React from "react";
import { Plus, Layers } from "./Icons.jsx";
import { CATEGORIAS } from "../data/categories.js";
import { fmtWeight } from "../utils/format.js";
export default function ProductForm({
  armarios,
  avulsasPrateleiras,
  form,
  handleAddProduct,
  locationLabelFor,
  prateleiras,
  previewWeight,
  setActiveTab,
  setForm,
}) {
  return (
    <form className="g-form" onSubmit={handleAddProduct}>
      <div className="g-form-grid">
        <div className="g-field full">
          <label htmlFor="gieci-field-1">{"Nome do produto"}</label>
          <input
            className="g-input g-extracted-5"
            type="text"
            maxLength={160}
            required
            placeholder="Ex: Filé de Frango Congelado"
            value={form.name}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                name: e.target.value,
              }))
            }
            id="gieci-field-1"
          />
        </div>
        <div className="g-field">
          <label htmlFor="gieci-field-2">{"Categoria"}</label>
          <select
            className="g-input g-extracted-5"
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                category: e.target.value,
              }))
            }
            id="gieci-field-2"
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="g-field">
          <label htmlFor="gieci-field-3">{"Peso unit\u00E1rio (g)"}</label>
          <input
            className="g-input"
            type="number"
            step="0.001"
            max="1000000000"
            required
            min="0.001"
            placeholder="Ex: 2000"
            value={form.unitWeight}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                unitWeight: e.target.value,
              }))
            }
            id="gieci-field-3"
          />
        </div>
        <div className="g-field full">
          <label htmlFor="gieci-field-4">{"Prateleira"}</label>
          {prateleiras.length === 0 ? (
            <div className="g-prateleira-empty">
              {"Nenhuma prateleira cadastrada ainda."}
              <button
                type="button"
                className="g-btn"
                onClick={() => setActiveTab("organizacao")}
              >
                <Layers size={13} />
                {" Criar prateleiras e arm\u00E1rios"}
              </button>
            </div>
          ) : (
            <React.Fragment>
              <select
                className="g-input g-extracted-5"
                value={form.prateleiraId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    prateleiraId: e.target.value,
                  }))
                }
                id="gieci-field-4"
                required
              >
                <option value="">{"Selecione uma prateleira"}</option>
                {armarios.map((a) => {
                  const opts = prateleiras.filter(
                    (pr) => pr.armarioId === a.id,
                  );
                  if (opts.length === 0) return null;
                  return (
                    <optgroup key={a.id} label={a.name}>
                      {opts.map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
                {avulsasPrateleiras.length > 0 && (
                  <optgroup label="Prateleiras Avulsas">
                    {avulsasPrateleiras.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              {form.prateleiraId && (
                <div className="g-select-hint">
                  {"Local selecionado: "}
                  {locationLabelFor(form.prateleiraId)}
                </div>
              )}
            </React.Fragment>
          )}
        </div>
        <div className="g-field">
          <label htmlFor="gieci-field-5">{"Quantidade inicial (unid.)"}</label>
          <input
            className="g-input"
            type="number"
            step="0.001"
            max="1000000000"
            required
            min="0"
            placeholder="Ex: 6"
            value={form.initialQty}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                initialQty: e.target.value,
              }))
            }
            id="gieci-field-5"
          />
        </div>
        <div className="g-field">
          <label htmlFor="gieci-field-6">
            {"Qtd. m\u00EDnima para alerta (unid.)"}
          </label>
          <input
            className="g-input"
            type="number"
            step="0.001"
            max="1000000000"
            required
            min="0"
            placeholder="Ex: 3"
            value={form.minQuantity}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                minQuantity: e.target.value,
              }))
            }
            id="gieci-field-6"
          />
        </div>
        <div className="g-preview-box">
          <span className="g-preview-label">
            {"Peso total calculado automaticamente"}
          </span>
          <span className="g-preview-value">{fmtWeight(previewWeight)}</span>
        </div>
        <div className="g-field full">
          <button type="submit" className="g-btn g-btn-primary g-btn-block">
            <Plus size={15} />
            {" Cadastrar produto"}
          </button>
        </div>
      </div>
    </form>
  );
}
