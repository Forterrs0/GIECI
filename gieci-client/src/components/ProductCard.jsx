import React from "react";
import { Scale, Plus, Minus, X, Clock } from "./Icons.jsx";
import { statusOf, fmtWeight, fmtQty } from "../utils/format.js";
export default function ProductCard({
  product,
  deleteProduct,
  isDemo,
  manualInputs,
  openSimulateId,
  quickAdjust,
  setManualInputs,
  setOpenSimulateId,
  submitManual,
}) {
  var _a;
  const status = statusOf(product);
  const isSimOpen = openSimulateId === product.id;
  return (
    <div className="g-card" key={product.id}>
      <div className="g-card-top">
        <span className="g-pill">{product.category}</span>
        <span className={`g-badge ${status.key}`}>{status.label}</span>
      </div>
      <p className="g-card-name">{product.name}</p>
      <div className="g-readout">
        <div>
          <span className={`g-readout-qty ${status.key}`}>
            {fmtQty(product)}
          </span>
          <span className="g-readout-unit">{"unid."}</span>
        </div>
        <div className="g-readout-weight">
          {fmtWeight(product.currentWeight)}
        </div>
      </div>
      <div className="g-meta-row">
        <span>
          <Clock size={11} />
          {" m\u00EDnimo "}
          {product.minQuantity}
          {" unid."}
        </span>
      </div>
      <div className="g-quick-row">
        <button
          className="g-btn g-btn-icon"
          title={isDemo ? "Simular retirada de 1 unidade" : "Retirar 1 unidade"}
          onClick={() => quickAdjust(product, -1)}
        >
          <Minus size={15} />
        </button>
        <button
          className="g-btn g-btn-icon"
          title={isDemo ? "Simular adição de 1 unidade" : "Adicionar 1 unidade"}
          onClick={() => quickAdjust(product, 1)}
        >
          <Plus size={15} />
        </button>
        <button
          className="g-btn g-btn-block"
          onClick={() => setOpenSimulateId(isSimOpen ? null : product.id)}
        >
          {isSimOpen ? (
            <React.Fragment>
              <X size={14} />
              {" Fechar"}
            </React.Fragment>
          ) : (
            <React.Fragment>
              <Scale size={14} />
              {isDemo ? " Simular leitura" : " Ajustar peso"}
            </React.Fragment>
          )}
        </button>
      </div>
      {isSimOpen && (
        <div className="g-simulate-panel">
          {!isDemo && (
            <div className="g-simulate-label">
              ID do produto: {product.id} · Código: {product.code}
            </div>
          )}
          <div className="g-simulate-label">
            {isDemo
              ? "Informe manualmente o novo peso lido pela balança, como se um sensor tivesse enviado essa leitura ao sistema."
              : "Informe o peso atual em gramas. Este ajuste será registrado no histórico como movimentação manual."}
          </div>
          <div className="g-manual-row">
            <input
              className="g-input"
              type="number"
              step="0.001"
              max="1000000000"
              aria-label={`Novo peso de ${product.name} em gramas`}
              min="0"
              placeholder={`Peso atual: ${product.currentWeight} g`}
              value={
                (_a = manualInputs[product.id]) !== null && _a !== void 0
                  ? _a
                  : ""
              }
              onChange={(e) =>
                setManualInputs((prev) => ({
                  ...prev,
                  [product.id]: e.target.value,
                }))
              }
            />
            <button
              className="g-btn g-btn-primary"
              onClick={() => submitManual(product)}
            >
              {"Enviar"}
            </button>
          </div>
          <button
            className="g-footer-link danger"
            onClick={() => deleteProduct(product)}
          >
            Excluir produto
          </button>
        </div>
      )}
    </div>
  );
}
