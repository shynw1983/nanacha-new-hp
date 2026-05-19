"use client";

import { useMemo, useState } from "react";

export function AdminProductsBoard({ initialStores, initialStoreId, initialProducts }) {
  const [stores] = useState(initialStores);
  const [storeId, setStoreId] = useState(initialStoreId);
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const reloadStore = async (nextStoreId) => {
    setStoreId(nextStoreId);
    const response = await fetch(`/api/admin/products?store=${nextStoreId}`, { cache: "no-store" });
    if (response.ok) {
      const body = await response.json();
      setProducts(body.products || []);
    }
  };

  const updateProduct = async (drinkId, patch) => {
    const response = await fetch(`/api/admin/products/${drinkId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, ...patch }),
    });
    if (response.ok) {
      const body = await response.json();
      setProducts((current) => current.map((product) => (product.drinkId === drinkId ? body.product : product)));
    }
  };

  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase());
        const matchesFilter =
          filter === "all"
            ? true
            : filter === "available"
              ? product.isAvailable && product.websiteEnabled
              : !product.isAvailable || !product.websiteEnabled;
        return matchesQuery && matchesFilter;
      }),
    [products, query, filter],
  );
  const groupedProducts = useMemo(() => {
    const groups = [];
    const byCategory = new Map();

    visibleProducts.forEach((product) => {
      if (!byCategory.has(product.category)) {
        const group = {
          id: product.category,
          label: product.categoryLabel || product.category,
          products: [],
        };
        byCategory.set(product.category, group);
        groups.push(group);
      }

      byCategory.get(product.category).products.push(product);
    });

    return groups;
  }, [visibleProducts]);
  const summary = {
    active: products.filter((product) => product.isAvailable && product.websiteEnabled).length,
    soldOut: products.filter((product) => !product.isAvailable).length,
    paused: products.filter((product) => product.isAvailable && !product.websiteEnabled).length,
  };

  return (
    <>
      <section className="admin-inline-stats">
        <article>
          <span>販売中</span>
          <strong>{summary.active}</strong>
        </article>
        <article>
          <span>売り切れ</span>
          <strong>{summary.soldOut}</strong>
        </article>
        <article>
          <span>予約停止</span>
          <strong>{summary.paused}</strong>
        </article>
      </section>

      <section className="admin-toolbar">
        <select value={storeId} onChange={(event) => reloadStore(event.target.value)}>
          {stores.map((store) => (
            <option value={store.id} key={store.id}>{store.name}</option>
          ))}
        </select>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="商品名で検索" />
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">すべて</option>
          <option value="available">販売中</option>
          <option value="stopped">停止中</option>
        </select>
      </section>

      <section className="admin-product-groups">
        {groupedProducts.map((group) => (
          <section className="admin-product-group" key={group.id}>
            <div className="admin-product-group-heading">
              <div>
                <span>{group.id}</span>
                <h2>{group.label}</h2>
              </div>
              <strong>{group.products.length} 件</strong>
            </div>
            <div className="admin-product-grid">
              {group.products.map((product) => (
                <article className="admin-product-card" key={product.drinkId}>
                  {product.imageUrl ? (
                    <img src={product.imageUrl.startsWith("/") ? product.imageUrl : `/${product.imageUrl}`} alt="" />
                  ) : null}
                  <div>
                    <h3>{product.name}</h3>
                    <p>¥{product.effectivePrice}</p>
                  </div>
                  <strong className={`admin-product-state ${product.isAvailable && product.websiteEnabled ? "is-live" : "is-paused"}`}>
                    {product.isAvailable ? (product.websiteEnabled ? "販売中" : "予約停止") : "売り切れ"}
                  </strong>
                  <div className="admin-product-switches">
                    <label>
                      <input
                        type="checkbox"
                        checked={product.isAvailable}
                        onChange={(event) => updateProduct(product.drinkId, { isAvailable: event.target.checked })}
                      />
                      在庫あり
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={product.websiteEnabled}
                        onChange={(event) => updateProduct(product.drinkId, { websiteEnabled: event.target.checked })}
                      />
                      予約受付
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </section>
    </>
  );
}
