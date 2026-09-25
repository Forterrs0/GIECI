import { Plus, Layers } from "./Icons.jsx";

export default function ShelfBlock({
  pr,
  goAddProduct,
  productsByPrateleira,
  renderProductCard,
}) {
  const items = productsByPrateleira[pr.id] || [];

  return (
    <section className="g-prateleira-block">
      <div className="g-prateleira-header">
        <div className="g-prateleira-header-left">
          <Layers size={14} />

          <span>{pr.name}</span>
        </div>

        <span className="g-prateleira-count">
          {items.length} {items.length === 1 ? "item" : "itens"}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="g-prateleira-empty">
          <span>Nenhum produto nesta prateleira ainda.</span>

          <button
            className="g-btn"
            onClick={() => goAddProduct(pr.id)}
          >
            <Plus size={13} />
            Adicionar produto aqui
          </button>
        </div>
      ) : (
        <div className="g-shelf-product-grid">
          {items.map((product) => (
            <div
              className="g-shelf-product-item"
              key={product.id}
            >
              {renderProductCard(product)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
