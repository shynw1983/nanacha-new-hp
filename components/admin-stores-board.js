"use client";

import { useState } from "react";

export function AdminStoresBoard({ initialStores }) {
  const [stores, setStores] = useState(initialStores);

  const updateStore = async (storeId, patch) => {
    const response = await fetch(`/api/admin/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (response.ok) {
      const body = await response.json();
      setStores((current) =>
        current.map((store) => (store.id === storeId ? { ...store, operation: body.operation } : store)),
      );
    }
  };

  return (
    <section className="admin-store-grid">
      {stores.map((store) => (
        <article className="admin-store-card" key={store.id}>
          <div>
            <span>{store.isPrimary ? "primary store" : "store"}</span>
            <h2>{store.name}</h2>
          </div>
          <label className="admin-store-toggle">
            <input
              type="checkbox"
              checked={store.operation.reservationsEnabled}
              onChange={(event) => updateStore(store.id, { reservationsEnabled: event.target.checked })}
            />
            予約受付
          </label>
          <label>
            ステータスメモ
            <input
              type="text"
              value={store.operation.statusNote}
              onChange={(event) => updateStore(store.id, { statusNote: event.target.value })}
              placeholder="例：本日タピオカ仕込み遅れ"
            />
          </label>
        </article>
      ))}
    </section>
  );
}
