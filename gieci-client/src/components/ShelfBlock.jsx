import { Plus, Layers } from "./Icons.jsx";
export default function ShelfBlock({
  pr,
  goAddProduct,
  productsByPrateleira,
  renderProductCard,
}) {
  const items = productsByPrateleira[pr.id] || [];
  return (
    <div className="g-prateleira-block" key={pr.id}>
      <div className="g-prateleira-header">
        <span className="g-prateleira-header-left">
          <Layers size={13} /> {pr.name}
        </span>
        <span className="g-prateleira-count">
          {items.length} {items.length === 1 ? "item" : "itens"}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="g-prateleira-empty">
          {"Nenhum produto nesta prateleira ainda."}
          <button className="g-btn" onClick={() => goAddProduct(pr.id)}>
            <Plus size={13} />
            {" Adicionar produto aqui"}
          </button>
        </div>
      ) : (
        <div className="g-grid">
          {items.map((product) => renderProductCard(product))}
        </div>
      )}
    </div>
  );
}
