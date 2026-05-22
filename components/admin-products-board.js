"use client";

import { useMemo, useState } from "react";

const emptyProduct = {
  drinkId: "",
  name: "",
  category: "",
  price: "",
  description: "",
  imageUrl: "",
  temperatures: ["ICE"],
  allowedSizes: [],
  allowedSweetness: [],
  allowedIce: [],
  allowedOptions: [],
  allowedToppings: [],
  sortOrder: 9999,
  isActive: true,
  isRecommended: false,
  isFeatured: false,
};

const emptyCategory = {
  id: "",
  label: "",
  note: "",
  sortOrder: 9999,
  isTapiocaFree: false,
  hasWhipByDefault: false,
  isActive: true,
};

const emptySettingForm = {
  type: "topping",
  id: "",
  label: "",
  price: 0,
  valuesText: "",
  sortOrder: 9999,
  isActive: true,
};

const settingTypeLabels = {
  size: "サイズ",
  sweetness: "甘さ",
  ice: "氷",
  hotIce: "HOT氷表示",
  option: "オプション",
  topping: "トッピング",
};

const toArray = (value) => (Array.isArray(value) ? value.map(String).filter(Boolean) : []);
const toTextArray = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
const normalizeAssetUrl = (url = "") => (url.startsWith("/") || url.startsWith("http") ? url : `/${url}`);
const productToForm = (product) => ({
  drinkId: product.drinkId || product.id || "",
  name: product.name || "",
  category: product.category || "",
  price: product.price ?? "",
  description: product.description || "",
  imageUrl: product.imageUrl || "",
  temperatures: toArray(product.temperatures).length ? toArray(product.temperatures) : ["ICE"],
  allowedSizes: toArray(product.allowedSizes),
  allowedSweetness: toArray(product.allowedSweetness),
  allowedIce: toArray(product.allowedIce),
  allowedOptions: toArray(product.allowedOptions),
  allowedToppings: toArray(product.allowedToppings),
  sortOrder: product.sortOrder || 9999,
  isActive: product.isActive !== false,
  isRecommended: product.isRecommended === true,
  isFeatured: product.isFeatured === true,
});

const formToProduct = (form) => ({
  drinkId: form.drinkId,
  name: form.name,
  category: form.category,
  price: Number(form.price),
  description: form.description,
  imageUrl: form.imageUrl,
  temperatures: toArray(form.temperatures).length ? toArray(form.temperatures) : ["ICE"],
  allowedSizes: toArray(form.allowedSizes),
  allowedSweetness: toArray(form.allowedSweetness),
  allowedIce: toArray(form.allowedIce),
  allowedOptions: toArray(form.allowedOptions),
  allowedToppings: toArray(form.allowedToppings),
  sortOrder: Number(form.sortOrder) || 9999,
  isActive: form.isActive,
  isRecommended: form.isRecommended,
  isFeatured: form.isFeatured,
});

const makeProductId = (name) =>
  String(name || "drink")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || `drink-${Date.now()}`;

const settingToForm = (item) => ({
  type: item.type || "topping",
  id: item.id || "",
  label: item.label || "",
  price: item.price ?? 0,
  valuesText: Array.isArray(item.values) ? item.values.join(", ") : "",
  sortOrder: item.sortOrder || 9999,
  isActive: item.isActive !== false,
});

function AdminChoiceGroup({ title, hint, values, selected, onToggle, onSelectAll, onClear }) {
  return (
    <fieldset className="admin-choice-group">
      <div>
        <legend>{title}</legend>
        {hint ? <small>{hint}</small> : null}
      </div>
      <div className="admin-choice-actions">
        <button type="button" className="secondary" onClick={onSelectAll}>すべて</button>
        <button type="button" className="secondary" onClick={onClear}>制限なし</button>
      </div>
      <div className="admin-choice-options">
        {values.map((item) => {
          const value = typeof item === "string" ? item : item.id;
          const label = typeof item === "string" ? item : item.label;
          const price = typeof item === "string" || !item.price ? "" : ` ${item.price > 0 ? "+" : ""}¥${item.price}`;

          return (
            <label key={value}>
              <input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} />
              {label}{price}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function ProductEditor({
  editingId,
  canEditCatalog,
  productForm,
  setProductForm,
  categories,
  settings,
  saveProduct,
  removeProduct,
  toggleProductArrayValue,
  setProductArrayValues,
}) {
  return (
    <form className="admin-panel admin-product-editor" onSubmit={saveProduct}>
      <div className="admin-product-editor-heading">
        <h2>{editingId ? "商品を編集" : "商品を追加"}</h2>
        {canEditCatalog && editingId ? <button type="button" className="secondary" onClick={removeProduct}>削除</button> : null}
      </div>
      <label>
        商品ID
        <input
          value={productForm.drinkId}
          onChange={(event) => setProductForm({ ...productForm, drinkId: event.target.value })}
          disabled={Boolean(editingId)}
          placeholder="例：matcha-latte"
        />
      </label>
      <label>
        商品名
        <input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} required />
      </label>
      <div className="admin-form-grid">
        <label>
          カテゴリ
          <select value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} required>
            {categories.filter((category) => category.isActive !== false).map((category) => (
              <option value={category.id} key={category.id}>{category.label}</option>
            ))}
          </select>
        </label>
        <label>
          価格
          <input type="number" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} required />
        </label>
        <label>
          並び順
          <input type="number" value={productForm.sortOrder} onChange={(event) => setProductForm({ ...productForm, sortOrder: event.target.value })} />
        </label>
      </div>
      <label>
        説明
        <textarea value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} rows={3} />
      </label>
      <label>
        画像URL
        <input value={productForm.imageUrl} onChange={(event) => setProductForm({ ...productForm, imageUrl: event.target.value })} placeholder="assets/menu/drink-01.png" />
      </label>
      <section className="admin-choice-grid">
        <AdminChoiceGroup
          title="温度"
          values={settings.temperatures}
          selected={productForm.temperatures}
          onToggle={(value) => toggleProductArrayValue("temperatures", value)}
          onSelectAll={() => setProductArrayValues("temperatures", settings.temperatures)}
          onClear={() => setProductArrayValues("temperatures", ["ICE"])}
        />
        <AdminChoiceGroup
          title="サイズ"
          hint="空の場合は全サイズを選択できます。"
          values={settings.sizes}
          selected={productForm.allowedSizes}
          onToggle={(value) => toggleProductArrayValue("allowedSizes", value)}
          onSelectAll={() => setProductArrayValues("allowedSizes", settings.sizes.map((item) => item.id))}
          onClear={() => setProductArrayValues("allowedSizes", [])}
        />
        <AdminChoiceGroup
          title="甘さ"
          hint="空の場合は全項目を選択できます。"
          values={settings.sweetness}
          selected={productForm.allowedSweetness}
          onToggle={(value) => toggleProductArrayValue("allowedSweetness", value)}
          onSelectAll={() => setProductArrayValues("allowedSweetness", settings.sweetness)}
          onClear={() => setProductArrayValues("allowedSweetness", [])}
        />
        <AdminChoiceGroup
          title="氷"
          hint="空の場合は全項目を選択できます。"
          values={settings.ice}
          selected={productForm.allowedIce}
          onToggle={(value) => toggleProductArrayValue("allowedIce", value)}
          onSelectAll={() => setProductArrayValues("allowedIce", settings.ice)}
          onClear={() => setProductArrayValues("allowedIce", [])}
        />
        <AdminChoiceGroup
          title="オプション"
          hint="空の場合は全オプションを選択できます。"
          values={settings.options.filter((item) => item.id !== "none")}
          selected={productForm.allowedOptions}
          onToggle={(value) => toggleProductArrayValue("allowedOptions", value)}
          onSelectAll={() => setProductArrayValues("allowedOptions", settings.options.filter((item) => item.id !== "none").map((item) => item.id))}
          onClear={() => setProductArrayValues("allowedOptions", [])}
        />
        <AdminChoiceGroup
          title="トッピング"
          hint="空の場合は全トッピングを選択できます。"
          values={settings.toppings}
          selected={productForm.allowedToppings}
          onToggle={(value) => toggleProductArrayValue("allowedToppings", value)}
          onSelectAll={() => setProductArrayValues("allowedToppings", settings.toppings.map((item) => item.id))}
          onClear={() => setProductArrayValues("allowedToppings", [])}
        />
      </section>
      <fieldset className="admin-product-flags">
        <label>
          <input type="checkbox" checked={productForm.isActive} onChange={(event) => setProductForm({ ...productForm, isActive: event.target.checked })} />
          メニューに表示
        </label>
        <label>
          <input type="checkbox" checked={productForm.isRecommended} onChange={(event) => setProductForm({ ...productForm, isRecommended: event.target.checked })} />
          おすすめ
        </label>
        <label>
          <input type="checkbox" checked={productForm.isFeatured} onChange={(event) => setProductForm({ ...productForm, isFeatured: event.target.checked })} />
          トップ掲載
        </label>
      </fieldset>
      <button type="submit" disabled={!canEditCatalog}>保存する</button>
    </form>
  );
}

function SettingEditor({
  canEditCatalog,
  editingSettingKey,
  settingForm,
  setSettingForm,
  saveSetting,
  removeSetting,
}) {
  return (
    <form className="admin-panel admin-product-editor" onSubmit={saveSetting}>
      <div className="admin-product-editor-heading">
        <h2>{editingSettingKey ? "項目を編集" : "項目を追加"}</h2>
        {editingSettingKey ? <button type="button" className="secondary" onClick={removeSetting}>削除</button> : null}
      </div>
      <label>
        種類
        <select
          value={settingForm.type}
          onChange={(event) => setSettingForm({ ...settingForm, type: event.target.value })}
          disabled={Boolean(editingSettingKey)}
        >
          <option value="topping">トッピング</option>
          <option value="option">オプション</option>
          <option value="size">サイズ</option>
          <option value="sweetness">甘さセット</option>
          <option value="ice">氷セット</option>
          <option value="hotIce">HOT氷表示</option>
        </select>
      </label>
      <label>
        ID
        <input
          value={settingForm.id}
          onChange={(event) => setSettingForm({ ...settingForm, id: event.target.value })}
          placeholder="例：extra-pudding"
          disabled={Boolean(editingSettingKey)}
          required
        />
      </label>
      {["sweetness", "ice"].includes(settingForm.type) ? (
        <label>
          項目
          <input value={settingForm.valuesText} onChange={(event) => setSettingForm({ ...settingForm, valuesText: event.target.value })} placeholder="ふつう, 多め, 少なめ" required />
        </label>
      ) : (
        <label>
          表示名
          <input value={settingForm.label} onChange={(event) => setSettingForm({ ...settingForm, label: event.target.value })} placeholder="プリン追加" required />
        </label>
      )}
      {["size", "option", "topping"].includes(settingForm.type) ? (
        <label>
          価格
          <input type="number" value={settingForm.price} onChange={(event) => setSettingForm({ ...settingForm, price: event.target.value })} />
        </label>
      ) : null}
      <label>
        並び順
        <input type="number" value={settingForm.sortOrder} onChange={(event) => setSettingForm({ ...settingForm, sortOrder: event.target.value })} />
      </label>
      <fieldset className="admin-product-flags">
        <label>
          <input type="checkbox" checked={settingForm.isActive} onChange={(event) => setSettingForm({ ...settingForm, isActive: event.target.checked })} />
          表示中
        </label>
      </fieldset>
      <button type="submit" disabled={!canEditCatalog}>{editingSettingKey ? "保存する" : "追加する"}</button>
    </form>
  );
}

export function AdminProductsBoard({
  initialStores,
  initialStoreId,
  initialProducts,
  initialCatalogProducts,
  initialCategories,
  menuSettings,
  initialSettingItems,
  canEditCatalog,
}) {
  const [stores] = useState(initialStores);
  const [storeId, setStoreId] = useState(initialStoreId);
  const [products, setProducts] = useState(initialProducts);
  const [catalogProducts, setCatalogProducts] = useState(initialCatalogProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [settingItems, setSettingItems] = useState(initialSettingItems || []);
  const [currentMenuSettings, setCurrentMenuSettings] = useState(menuSettings);
  const [tab, setTab] = useState("store");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState("");
  const [isEditingNewProduct, setIsEditingNewProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    ...emptyProduct,
    category: initialCategories[0]?.id || "",
  });
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [settingForm, setSettingForm] = useState(emptySettingForm);
  const [editingSettingKey, setEditingSettingKey] = useState("");
  const [message, setMessage] = useState("");
  const settings = currentMenuSettings || {
    temperatures: ["ICE", "HOT"],
    sizes: [],
    sweetness: [],
    ice: [],
    options: [],
    toppings: [],
  };

  const toggleProductArrayValue = (field, value) => {
    setProductForm((current) => {
      const values = toArray(current[field]);
      return {
        ...current,
        [field]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
      };
    });
  };

  const setProductArrayValues = (field, values) => {
    setProductForm((current) => ({ ...current, [field]: values }));
  };

  const reloadStore = async (nextStoreId) => {
    setStoreId(nextStoreId);
    const response = await fetch(`/api/admin/products?store=${nextStoreId}`, { cache: "no-store" });
    if (response.ok) {
      const body = await response.json();
      setProducts(body.products || []);
      setCatalogProducts(body.catalogProducts || []);
      setCategories(body.categories || []);
      setCurrentMenuSettings(body.menuSettings || currentMenuSettings);
      setSettingItems(body.settingItems || settingItems);
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

  const startNewProduct = () => {
    setEditingId("");
    setIsEditingNewProduct(true);
    setMessage("");
    setProductForm({
      ...emptyProduct,
      category: categories[0]?.id || "",
      sortOrder: catalogProducts.length + 1,
    });
    setTab("catalog");
  };

  const startEditProduct = (product) => {
    setEditingId(product.drinkId);
    setIsEditingNewProduct(false);
    setMessage("");
    setProductForm(productToForm(product));
    setTab("catalog");
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    setMessage("");
    const payload = formToProduct({
      ...productForm,
      drinkId: productForm.drinkId || makeProductId(productForm.name),
    });
    const response = await fetch(editingId ? `/api/admin/products/${editingId}` : "/api/admin/products", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "保存できませんでした。");
      return;
    }

    setCatalogProducts((current) =>
      editingId
        ? current.map((product) => (product.drinkId === editingId ? body.product : product))
        : [...current, body.product],
    );
    setProducts((current) =>
      editingId
        ? current.map((product) =>
            product.drinkId === editingId
              ? { ...product, name: body.product.name, category: body.product.category, categoryLabel: body.product.categoryLabel, basePrice: body.product.price, imageUrl: body.product.imageUrl }
              : product,
          )
        : current,
    );
    await reloadStore(storeId);
    setEditingId(body.product.drinkId);
    setIsEditingNewProduct(false);
    setProductForm(productToForm(body.product));
    setMessage("保存しました。");
  };

  const removeProduct = async () => {
    if (!editingId || !window.confirm("この商品を削除します。注文履歴は残りますが、メニューと店舗管理からは消えます。")) {
      return;
    }
    const response = await fetch(`/api/admin/products/${editingId}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "削除できませんでした。");
      return;
    }
    setCatalogProducts((current) => current.filter((product) => product.drinkId !== editingId));
    setProducts((current) => current.filter((product) => product.drinkId !== editingId));
    await reloadStore(storeId);
    setEditingId("");
    setIsEditingNewProduct(false);
    setProductForm({ ...emptyProduct, category: categories[0]?.id || "" });
    setMessage("削除しました。");
  };

  const createCategory = async (event) => {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/admin/product-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(categoryForm),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "カテゴリを作成できませんでした。");
      return;
    }
    setCategories((current) => [...current, body.category]);
    setProductForm((current) => ({ ...current, category: body.category.id }));
    setCategoryForm(emptyCategory);
    setMessage("カテゴリを追加しました。");
  };

  const startNewSetting = () => {
    setEditingSettingKey("");
    setSettingForm(emptySettingForm);
    setMessage("");
  };

  const startEditSetting = (item) => {
    setEditingSettingKey(`${item.type}/${item.id}`);
    setSettingForm(settingToForm(item));
    setMessage("");
  };

  const saveSetting = async (event) => {
    event.preventDefault();
    setMessage("");
    const isEditing = Boolean(editingSettingKey);
    const response = await fetch(
      isEditing
        ? `/api/admin/menu-settings/${encodeURIComponent(settingForm.type)}/${encodeURIComponent(settingForm.id)}`
        : "/api/admin/menu-settings",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: settingForm.type,
          id: settingForm.id,
          label: settingForm.label,
          price: settingForm.price,
          values: toTextArray(settingForm.valuesText),
          sortOrder: settingForm.sortOrder,
          isActive: settingForm.isActive,
        }),
      },
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "設定項目を保存できませんでした。");
      return;
    }
    setCurrentMenuSettings(body.menuSettings || currentMenuSettings);
    setSettingItems(body.settingItems || settingItems);
    setEditingSettingKey(`${body.setting?.type || settingForm.type}/${body.setting?.id || settingForm.id}`);
    setSettingForm(settingToForm(body.setting || settingForm));
    setMessage("設定項目を保存しました。");
  };

  const removeSetting = async () => {
    if (!editingSettingKey || !window.confirm("この設定項目を削除します。商品側で選択済みの場合は、該当商品の制限も見直してください。")) {
      return;
    }
    const response = await fetch(`/api/admin/menu-settings/${encodeURIComponent(settingForm.type)}/${encodeURIComponent(settingForm.id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "設定項目を削除できませんでした。");
      return;
    }
    setCurrentMenuSettings(body.menuSettings || currentMenuSettings);
    setSettingItems(body.settingItems || settingItems);
    setEditingSettingKey("");
    setSettingForm(emptySettingForm);
    setMessage("設定項目を削除しました。");
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
  const visibleCatalogProducts = useMemo(
    () =>
      catalogProducts.filter((product) => {
        const text = `${product.name} ${product.drinkId} ${product.categoryLabel || product.category}`.toLowerCase();
        return text.includes(query.toLowerCase());
      }),
    [catalogProducts, query],
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

      <section className="admin-toolbar admin-product-tabs">
        <button type="button" className={tab === "store" ? "" : "secondary"} onClick={() => setTab("store")}>
          店舗別販売
        </button>
        <button type="button" className={tab === "catalog" ? "" : "secondary"} onClick={() => setTab("catalog")}>
          商品マスター
        </button>
        <button type="button" className={tab === "categories" ? "" : "secondary"} onClick={() => setTab("categories")}>
          カテゴリ
        </button>
        <button type="button" className={tab === "settings" ? "" : "secondary"} onClick={() => setTab("settings")}>
          カスタム項目
        </button>
      </section>

      <section className="admin-toolbar">
        {tab === "store" ? (
          <select value={storeId} onChange={(event) => reloadStore(event.target.value)}>
            {stores.map((store) => (
              <option value={store.id} key={store.id}>{store.name}</option>
            ))}
          </select>
        ) : null}
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="商品名で検索" />
        {tab === "store" ? (
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">すべて</option>
            <option value="available">販売中</option>
            <option value="stopped">停止中</option>
          </select>
        ) : null}
        {tab === "catalog" && canEditCatalog ? (
          <button type="button" onClick={startNewProduct}>商品を追加</button>
        ) : null}
      </section>

      {message ? <p className="admin-product-message">{message}</p> : null}
      {!canEditCatalog && tab !== "store" ? (
        <p className="admin-product-message">DATABASE_URL または権限が不足しているため、商品マスターは読み取り専用です。</p>
      ) : null}

      {tab === "store" ? (
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
                    {product.imageUrl ? <img src={normalizeAssetUrl(product.imageUrl)} alt="" /> : null}
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
                      <label>
                        価格上書き
                        <input
                          type="number"
                          value={product.priceOverride ?? ""}
                          onChange={(event) => updateProduct(product.drinkId, { priceOverride: event.target.value })}
                          placeholder={String(product.basePrice)}
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </section>
      ) : null}

      {tab === "catalog" ? (
        <section className="admin-catalog-layout">
          <section className="admin-panel admin-catalog-list">
            <h2>商品一覧</h2>
            {visibleCatalogProducts.map((product) => (
              <div className="admin-catalog-list-item" key={product.drinkId}>
                <button
                  type="button"
                  className={editingId === product.drinkId ? "is-selected" : ""}
                  onClick={() => startEditProduct(product)}
                >
                  <span>{product.categoryLabel || product.category}</span>
                  <strong>{product.name}</strong>
                  <small>{product.isActive ? `¥${product.price}` : "停止中"}</small>
                </button>
                {editingId === product.drinkId ? (
                  <div className="admin-catalog-inline-editor">
                    <ProductEditor
                      editingId={editingId}
                      canEditCatalog={canEditCatalog}
                      productForm={productForm}
                      setProductForm={setProductForm}
                      categories={categories}
                      settings={settings}
                      saveProduct={saveProduct}
                      removeProduct={removeProduct}
                      toggleProductArrayValue={toggleProductArrayValue}
                      setProductArrayValues={setProductArrayValues}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </section>

          {isEditingNewProduct ? (
            <div className="admin-catalog-inline-editor is-new">
              <ProductEditor
                editingId={editingId}
                canEditCatalog={canEditCatalog}
                productForm={productForm}
                setProductForm={setProductForm}
                categories={categories}
                settings={settings}
                saveProduct={saveProduct}
                removeProduct={removeProduct}
                toggleProductArrayValue={toggleProductArrayValue}
                setProductArrayValues={setProductArrayValues}
              />
            </div>
          ) : null}

          <form className="admin-panel admin-product-editor admin-product-editor-side" onSubmit={saveProduct}>
            <div className="admin-product-editor-heading">
              <h2>{editingId ? "商品を編集" : "商品を追加"}</h2>
              {canEditCatalog && editingId ? <button type="button" className="secondary" onClick={removeProduct}>削除</button> : null}
            </div>
            <label>
              商品ID
              <input
                value={productForm.drinkId}
                onChange={(event) => setProductForm({ ...productForm, drinkId: event.target.value })}
                disabled={Boolean(editingId)}
                placeholder="例：matcha-latte"
              />
            </label>
            <label>
              商品名
              <input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} required />
            </label>
            <div className="admin-form-grid">
              <label>
                カテゴリ
                <select value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} required>
                  {categories.filter((category) => category.isActive !== false).map((category) => (
                    <option value={category.id} key={category.id}>{category.label}</option>
                  ))}
                </select>
              </label>
              <label>
                価格
                <input type="number" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} required />
              </label>
              <label>
                並び順
                <input type="number" value={productForm.sortOrder} onChange={(event) => setProductForm({ ...productForm, sortOrder: event.target.value })} />
              </label>
            </div>
            <label>
              説明
              <textarea value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} rows={3} />
            </label>
            <label>
              画像URL
              <input value={productForm.imageUrl} onChange={(event) => setProductForm({ ...productForm, imageUrl: event.target.value })} placeholder="assets/menu/drink-01.png" />
            </label>
            <section className="admin-choice-grid">
              <AdminChoiceGroup
                title="温度"
                values={settings.temperatures}
                selected={productForm.temperatures}
                onToggle={(value) => toggleProductArrayValue("temperatures", value)}
                onSelectAll={() => setProductArrayValues("temperatures", settings.temperatures)}
                onClear={() => setProductArrayValues("temperatures", ["ICE"])}
              />
              <AdminChoiceGroup
                title="サイズ"
                hint="空の場合は全サイズを選択できます。"
                values={settings.sizes}
                selected={productForm.allowedSizes}
                onToggle={(value) => toggleProductArrayValue("allowedSizes", value)}
                onSelectAll={() => setProductArrayValues("allowedSizes", settings.sizes.map((item) => item.id))}
                onClear={() => setProductArrayValues("allowedSizes", [])}
              />
              <AdminChoiceGroup
                title="甘さ"
                hint="空の場合は全項目を選択できます。"
                values={settings.sweetness}
                selected={productForm.allowedSweetness}
                onToggle={(value) => toggleProductArrayValue("allowedSweetness", value)}
                onSelectAll={() => setProductArrayValues("allowedSweetness", settings.sweetness)}
                onClear={() => setProductArrayValues("allowedSweetness", [])}
              />
              <AdminChoiceGroup
                title="氷"
                hint="空の場合は全項目を選択できます。"
                values={settings.ice}
                selected={productForm.allowedIce}
                onToggle={(value) => toggleProductArrayValue("allowedIce", value)}
                onSelectAll={() => setProductArrayValues("allowedIce", settings.ice)}
                onClear={() => setProductArrayValues("allowedIce", [])}
              />
              <AdminChoiceGroup
                title="オプション"
                hint="空の場合は全オプションを選択できます。"
                values={settings.options.filter((item) => item.id !== "none")}
                selected={productForm.allowedOptions}
                onToggle={(value) => toggleProductArrayValue("allowedOptions", value)}
                onSelectAll={() => setProductArrayValues("allowedOptions", settings.options.filter((item) => item.id !== "none").map((item) => item.id))}
                onClear={() => setProductArrayValues("allowedOptions", [])}
              />
              <AdminChoiceGroup
                title="トッピング"
                hint="空の場合は全トッピングを選択できます。"
                values={settings.toppings}
                selected={productForm.allowedToppings}
                onToggle={(value) => toggleProductArrayValue("allowedToppings", value)}
                onSelectAll={() => setProductArrayValues("allowedToppings", settings.toppings.map((item) => item.id))}
                onClear={() => setProductArrayValues("allowedToppings", [])}
              />
            </section>
            <fieldset className="admin-product-flags">
              <label>
                <input type="checkbox" checked={productForm.isActive} onChange={(event) => setProductForm({ ...productForm, isActive: event.target.checked })} />
                メニューに表示
              </label>
              <label>
                <input type="checkbox" checked={productForm.isRecommended} onChange={(event) => setProductForm({ ...productForm, isRecommended: event.target.checked })} />
                おすすめ
              </label>
              <label>
                <input type="checkbox" checked={productForm.isFeatured} onChange={(event) => setProductForm({ ...productForm, isFeatured: event.target.checked })} />
                トップ掲載
              </label>
            </fieldset>
            <button type="submit" disabled={!canEditCatalog}>保存する</button>
          </form>
        </section>
      ) : null}

      {tab === "categories" ? (
        <section className="admin-catalog-layout">
          <section className="admin-panel admin-category-list">
            <h2>カテゴリ一覧</h2>
            {categories.map((category) => (
              <article key={category.id}>
                <div>
                  <span>{category.id}</span>
                  <strong>{category.label}</strong>
                  {category.note ? <small>{category.note}</small> : null}
                </div>
                <small>{category.isActive ? "表示中" : "停止中"}</small>
              </article>
            ))}
          </section>
          <form className="admin-panel admin-product-editor" onSubmit={createCategory}>
            <h2>カテゴリを追加</h2>
            <label>
              カテゴリID
              <input value={categoryForm.id} onChange={(event) => setCategoryForm({ ...categoryForm, id: event.target.value })} required />
            </label>
            <label>
              表示名
              <input value={categoryForm.label} onChange={(event) => setCategoryForm({ ...categoryForm, label: event.target.value })} required />
            </label>
            <label>
              説明
              <textarea value={categoryForm.note} onChange={(event) => setCategoryForm({ ...categoryForm, note: event.target.value })} rows={3} />
            </label>
            <label>
              並び順
              <input type="number" value={categoryForm.sortOrder} onChange={(event) => setCategoryForm({ ...categoryForm, sortOrder: event.target.value })} />
            </label>
            <fieldset className="admin-product-flags">
              <label>
                <input type="checkbox" checked={categoryForm.isTapiocaFree} onChange={(event) => setCategoryForm({ ...categoryForm, isTapiocaFree: event.target.checked })} />
                タピオカなしカテゴリ
              </label>
              <label>
                <input type="checkbox" checked={categoryForm.hasWhipByDefault} onChange={(event) => setCategoryForm({ ...categoryForm, hasWhipByDefault: event.target.checked })} />
                ホイップ標準
              </label>
            </fieldset>
            <button type="submit" disabled={!canEditCatalog}>追加する</button>
          </form>
        </section>
      ) : null}

      {tab === "settings" ? (
        <section className="admin-catalog-layout">
          <section className="admin-panel admin-category-list">
            <div className="admin-product-editor-heading">
              <h2>カスタム項目一覧</h2>
              <button type="button" className="secondary" onClick={startNewSetting}>新規</button>
            </div>
            {settingItems.map((item) => (
              <div className="admin-setting-list-item" key={`${item.type}-${item.id}`}>
                <article
                  className={editingSettingKey === `${item.type}/${item.id}` ? "is-selected" : ""}
                  onClick={() => startEditSetting(item)}
                >
                  <div>
                    <span>{settingTypeLabels[item.type] || item.type} / {item.id}</span>
                    <strong>{item.values?.length ? item.values.join(", ") : item.label}</strong>
                    {["size", "option", "topping"].includes(item.type) ? <small>¥{item.price}</small> : null}
                  </div>
                  <small>{item.isActive ? "表示中" : "停止中"}</small>
                </article>
                {editingSettingKey === `${item.type}/${item.id}` ? (
                  <div className="admin-catalog-inline-editor">
                    <SettingEditor
                      canEditCatalog={canEditCatalog}
                      editingSettingKey={editingSettingKey}
                      settingForm={settingForm}
                      setSettingForm={setSettingForm}
                      saveSetting={saveSetting}
                      removeSetting={removeSetting}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </section>
          <div className="admin-product-editor-side">
            <SettingEditor
              canEditCatalog={canEditCatalog}
              editingSettingKey={editingSettingKey}
              settingForm={settingForm}
              setSettingForm={setSettingForm}
              saveSetting={saveSetting}
              removeSetting={removeSetting}
            />
          </div>
        </section>
      ) : null}
    </>
  );
}
