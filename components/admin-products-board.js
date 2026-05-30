"use client";

import { upload } from "@vercel/blob/client";
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
const categoryAccentIndex = (categoryId = "") =>
  Array.from(String(categoryId)).reduce((total, character) => total + character.charCodeAt(0), 0) % 6;
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

const categoryToForm = (category) => ({
  id: category.id || "",
  label: category.label || "",
  note: category.note || "",
  sortOrder: category.sortOrder || 9999,
  isTapiocaFree: category.isTapiocaFree === true,
  hasWhipByDefault: category.hasWhipByDefault === true,
  isActive: category.isActive !== false,
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

function AdminChoiceGroup({ title, hint, values, selected, onToggle, onSelectAll }) {
  return (
    <fieldset className="admin-choice-group">
      <div>
        <legend>{title}</legend>
        {hint ? <small>{hint}</small> : null}
      </div>
      <div className="admin-choice-actions">
        <button type="button" className="secondary" onClick={onSelectAll}>すべて選択</button>
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
  productSaveStatus,
  productForm,
  setProductForm,
  categories,
  settings,
  saveProduct,
  removeProduct,
  closeProductEditor,
  toggleProductArrayValue,
  setProductArrayValues,
}) {
  const [uploadState, setUploadState] = useState("");
  const imagePreviewUrl = productForm.imageUrl ? normalizeAssetUrl(productForm.imageUrl) : "";
  const saveButtonLabel = productSaveStatus === "saving" ? "保存中..." : productSaveStatus === "done" ? "保存完了" : "保存する";

  const uploadProductImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadState("アップロード中...");
    try {
      const safeName = `${productForm.drinkId || productForm.name || "product"}-${file.name}`.replace(/[^a-zA-Z0-9._-]+/g, "-");
      const blob = await upload(`product-images/${safeName}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/product-images/upload",
      });
      setProductForm({ ...productForm, imageUrl: blob.url });
      setUploadState("アップロードしました。");
    } catch (error) {
      setUploadState(error.message || "アップロードできませんでした。");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <form className="admin-panel admin-product-editor" onSubmit={saveProduct}>
      <div className="admin-product-editor-heading">
        <h2>{editingId ? "商品を編集" : "商品を追加"}</h2>
        <div className="admin-product-editor-heading-actions">
          <button type="button" className="secondary" onClick={closeProductEditor}>閉じる</button>
          {canEditCatalog && editingId ? <button type="button" className="secondary" onClick={removeProduct}>削除</button> : null}
        </div>
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
      <div className="admin-image-editor">
        {imagePreviewUrl ? <img src={imagePreviewUrl} alt="" /> : <div className="admin-image-placeholder">No image</div>}
        <label className="admin-file-upload-control">
          <span>画像をアップロード</span>
          <strong>ファイルを選択</strong>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadProductImage} />
        </label>
        {uploadState ? <small>{uploadState}</small> : null}
      </div>
      <section className="admin-choice-grid">
        <AdminChoiceGroup
          title="温度"
          values={settings.temperatures}
          selected={productForm.temperatures}
          onToggle={(value) => toggleProductArrayValue("temperatures", value)}
          onSelectAll={() => setProductArrayValues("temperatures", settings.temperatures)}
        />
        <AdminChoiceGroup
          title="サイズ"
          hint="空の場合は全サイズを選択できます。"
          values={settings.sizes}
          selected={productForm.allowedSizes}
          onToggle={(value) => toggleProductArrayValue("allowedSizes", value)}
          onSelectAll={() => setProductArrayValues("allowedSizes", settings.sizes.map((item) => item.id))}
        />
        <AdminChoiceGroup
          title="甘さ"
          hint="空の場合は全項目を選択できます。"
          values={settings.sweetness}
          selected={productForm.allowedSweetness}
          onToggle={(value) => toggleProductArrayValue("allowedSweetness", value)}
          onSelectAll={() => setProductArrayValues("allowedSweetness", settings.sweetness)}
        />
        <AdminChoiceGroup
          title="氷"
          hint="空の場合は全項目を選択できます。"
          values={settings.ice}
          selected={productForm.allowedIce}
          onToggle={(value) => toggleProductArrayValue("allowedIce", value)}
          onSelectAll={() => setProductArrayValues("allowedIce", settings.ice)}
        />
        <AdminChoiceGroup
          title="オプション"
          hint="空の場合は全オプションを選択できます。"
          values={settings.options.filter((item) => item.id !== "none")}
          selected={productForm.allowedOptions}
          onToggle={(value) => toggleProductArrayValue("allowedOptions", value)}
          onSelectAll={() => setProductArrayValues("allowedOptions", settings.options.filter((item) => item.id !== "none").map((item) => item.id))}
        />
        <AdminChoiceGroup
          title="トッピング"
          hint="空の場合は全トッピングを選択できます。"
          values={settings.toppings}
          selected={productForm.allowedToppings}
          onToggle={(value) => toggleProductArrayValue("allowedToppings", value)}
          onSelectAll={() => setProductArrayValues("allowedToppings", settings.toppings.map((item) => item.id))}
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
      <button type="submit" disabled={!canEditCatalog || productSaveStatus === "saving"}>{saveButtonLabel}</button>
    </form>
  );
}

function CategoryEditor({
  canEditCatalog,
  editingCategoryId,
  categoryForm,
  setCategoryForm,
  saveCategory,
  removeCategory,
}) {
  return (
    <form className="admin-panel admin-product-editor" onSubmit={saveCategory}>
      <div className="admin-product-editor-heading">
        <h2>{editingCategoryId ? "カテゴリを編集" : "カテゴリを追加"}</h2>
        {editingCategoryId ? <button type="button" className="secondary" onClick={removeCategory}>削除</button> : null}
      </div>
      <label>
        カテゴリID
        <input
          value={categoryForm.id}
          onChange={(event) => setCategoryForm({ ...categoryForm, id: event.target.value })}
          disabled={Boolean(editingCategoryId)}
          required
        />
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
          <input type="checkbox" checked={categoryForm.isActive} onChange={(event) => setCategoryForm({ ...categoryForm, isActive: event.target.checked })} />
          表示中
        </label>
        <label>
          <input type="checkbox" checked={categoryForm.isTapiocaFree} onChange={(event) => setCategoryForm({ ...categoryForm, isTapiocaFree: event.target.checked })} />
          タピオカなしカテゴリ
        </label>
        <label>
          <input type="checkbox" checked={categoryForm.hasWhipByDefault} onChange={(event) => setCategoryForm({ ...categoryForm, hasWhipByDefault: event.target.checked })} />
          ホイップ標準
        </label>
      </fieldset>
      <button type="submit" disabled={!canEditCatalog}>{editingCategoryId ? "保存する" : "追加する"}</button>
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
  initialStoreMenuItems,
  initialCatalogProducts,
  initialCategories,
  menuSettings,
  initialSettingItems,
  canEditCatalog,
}) {
  const [stores] = useState(initialStores);
  const [storeId, setStoreId] = useState(initialStoreId);
  const [products, setProducts] = useState(initialProducts);
  const [storeMenuItems, setStoreMenuItems] = useState(initialStoreMenuItems || []);
  const [catalogProducts, setCatalogProducts] = useState(initialCatalogProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [settingItems, setSettingItems] = useState(initialSettingItems || []);
  const [currentMenuSettings, setCurrentMenuSettings] = useState(menuSettings);
  const [tab, setTab] = useState("store");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState("");
  const [isEditingNewProduct, setIsEditingNewProduct] = useState(false);
  const [productSaveStatus, setProductSaveStatus] = useState("idle");
  const [productForm, setProductForm] = useState({
    ...emptyProduct,
    category: initialCategories[0]?.id || "",
  });
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [settingForm, setSettingForm] = useState(emptySettingForm);
  const [editingSettingKey, setEditingSettingKey] = useState("");
  const [draggingProductId, setDraggingProductId] = useState("");
  const [isSavingProductOrder, setIsSavingProductOrder] = useState(false);
  const [savingStoreProductIds, setSavingStoreProductIds] = useState([]);
  const [savingStoreMenuItemKeys, setSavingStoreMenuItemKeys] = useState([]);
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
      setStoreMenuItems(body.storeMenuItems || []);
      setCatalogProducts(body.catalogProducts || []);
      setCategories(body.categories || []);
      setCurrentMenuSettings(body.menuSettings || currentMenuSettings);
      setSettingItems(body.settingItems || settingItems);
    }
  };

  const updateProduct = async (drinkId, patch) => {
    const isStatusPatch = Object.prototype.hasOwnProperty.call(patch, "isAvailable") || Object.prototype.hasOwnProperty.call(patch, "websiteEnabled");
    if (isStatusPatch && savingStoreProductIds.includes(drinkId)) {
      return;
    }

    const previousProduct = products.find((product) => product.drinkId === drinkId);
    if (!previousProduct) {
      return;
    }

    const nextPriceOverride =
      patch.priceOverride === undefined
        ? previousProduct.priceOverride
        : patch.priceOverride === ""
          ? null
          : Number(patch.priceOverride);
    const nextProduct = {
      ...previousProduct,
      ...patch,
      priceOverride: Number.isFinite(nextPriceOverride) ? nextPriceOverride : null,
      effectivePrice: Number.isFinite(nextPriceOverride) ? nextPriceOverride : previousProduct.basePrice,
    };

    setProducts((current) => current.map((product) => (product.drinkId === drinkId ? nextProduct : product)));
    if (isStatusPatch) {
      setSavingStoreProductIds((current) => (current.includes(drinkId) ? current : [...current, drinkId]));
    }
    setMessage("保存中...");

    try {
      const response = await fetch(`/api/admin/products/${drinkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, ...patch }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "保存できませんでした。");
      }
      setProducts((current) => current.map((product) => (product.drinkId === drinkId ? body.product : product)));
      setMessage("保存完了");
    } catch (error) {
      setProducts((current) => current.map((product) => (product.drinkId === drinkId ? previousProduct : product)));
      setMessage(error.message || "保存できませんでした。");
    } finally {
      if (isStatusPatch) {
        setSavingStoreProductIds((current) => current.filter((id) => id !== drinkId));
      }
    }
  };

  const setProductGroupAvailability = async (categoryId, isAvailable) => {
    const groupProducts = products.filter((product) => product.category === categoryId);
    const targetProducts = groupProducts.filter((product) =>
      isAvailable ? !product.isAvailable || !product.websiteEnabled : product.isAvailable || product.websiteEnabled,
    );
    if (!targetProducts.length || targetProducts.some((product) => savingStoreProductIds.includes(product.drinkId))) {
      return;
    }

    const targetIds = targetProducts.map((product) => product.drinkId);
    const previousProducts = products;
    setSavingStoreProductIds((current) => Array.from(new Set([...current, ...targetIds])));
    setProducts((current) =>
      current.map((product) => (targetIds.includes(product.drinkId) ? { ...product, isAvailable, websiteEnabled: isAvailable } : product)),
    );
    setMessage(isAvailable ? "系列を販売中に戻しています..." : "系列を停止しています...");

    try {
      const responses = await Promise.all(
        targetProducts.map((product) =>
          fetch(`/api/admin/products/${product.drinkId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storeId, isAvailable, websiteEnabled: isAvailable }),
          }).then(async (response) => {
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(body.error || (isAvailable ? "系列を販売中に戻せませんでした。" : "系列を停止できませんでした。"));
            }
            return body.product;
          }),
        ),
      );
      const updatedById = new Map(responses.map((product) => [product.drinkId, product]));
      setProducts((current) => current.map((product) => updatedById.get(product.drinkId) || product));
      setMessage(isAvailable ? "系列を販売中に戻しました。" : "系列を停止しました。");
    } catch (error) {
      setProducts(previousProducts);
      setMessage(error.message || (isAvailable ? "系列を販売中に戻せませんでした。" : "系列を停止できませんでした。"));
    } finally {
      setSavingStoreProductIds((current) => current.filter((id) => !targetIds.includes(id)));
    }
  };

  const updateStoreMenuItem = async (item, isAvailable) => {
    const key = `${item.type}/${item.id}`;
    if (savingStoreMenuItemKeys.includes(key)) {
      return;
    }

    const previousItems = storeMenuItems;
    const nextItem = { ...item, isAvailable };
    setSavingStoreMenuItemKeys((current) => (current.includes(key) ? current : [...current, key]));
    setStoreMenuItems((current) => current.map((entry) => (`${entry.type}/${entry.id}` === key ? nextItem : entry)));
    setMessage("保存中...");

    try {
      const response = await fetch(`/api/admin/store-menu-items/${encodeURIComponent(item.type)}/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, isAvailable }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "保存できませんでした。");
      }
      setStoreMenuItems((current) => current.map((entry) => (`${entry.type}/${entry.id}` === key ? body.item : entry)));
      setMessage("保存完了");
    } catch (error) {
      setStoreMenuItems(previousItems);
      setMessage(error.message || "保存できませんでした。");
    } finally {
      setSavingStoreMenuItemKeys((current) => current.filter((entry) => entry !== key));
    }
  };

  const startNewProduct = () => {
    setEditingId("");
    setIsEditingNewProduct(true);
    setProductSaveStatus("idle");
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
    setProductSaveStatus("idle");
    setMessage("");
    setProductForm(productToForm(product));
    setTab("catalog");
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    if (productSaveStatus === "saving") {
      return;
    }
    setProductSaveStatus("saving");
    setMessage("保存中...");
    const payload = formToProduct({
      ...productForm,
      drinkId: productForm.drinkId || makeProductId(productForm.name),
    });
    try {
      const response = await fetch(editingId ? `/api/admin/products/${editingId}` : "/api/admin/products", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setProductSaveStatus("idle");
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
      setProductSaveStatus("done");
      setMessage("保存完了");
      window.setTimeout(() => {
        setEditingId("");
        setIsEditingNewProduct(false);
        setProductForm({ ...emptyProduct, category: categories[0]?.id || "" });
        setProductSaveStatus("idle");
      }, 800);
    } catch (error) {
      setProductSaveStatus("idle");
      setMessage(error.message || "保存できませんでした。");
    }
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

  const closeProductEditor = () => {
    setEditingId("");
    setIsEditingNewProduct(false);
    setProductSaveStatus("idle");
    setProductForm({ ...emptyProduct, category: categories[0]?.id || "" });
    setMessage("");
  };

  const reorderCatalogProducts = async (sourceId, targetId) => {
    if (!canEditCatalog || query.trim() || isSavingProductOrder || sourceId === targetId) {
      return;
    }

    const previousProducts = catalogProducts;
    const sourceIndex = previousProducts.findIndex((product) => product.drinkId === sourceId);
    const targetIndex = previousProducts.findIndex((product) => product.drinkId === targetId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }
    if (previousProducts[sourceIndex].category !== previousProducts[targetIndex].category) {
      setMessage("同じカテゴリ内でのみ並び替えできます。");
      return;
    }

    const nextProducts = [...previousProducts];
    const [movedProduct] = nextProducts.splice(sourceIndex, 1);
    nextProducts.splice(targetIndex, 0, movedProduct);
    const orderedProducts = nextProducts.map((product, index) => ({ ...product, sortOrder: index + 1 }));

    setCatalogProducts(orderedProducts);
    setIsSavingProductOrder(true);
    setMessage("並び順を保存しています...");

    try {
      const changedProducts = orderedProducts.filter((product) => {
        const previous = previousProducts.find((item) => item.drinkId === product.drinkId);
        return previous && previous.sortOrder !== product.sortOrder;
      });

      const responses = await Promise.all(
        changedProducts.map((product) =>
          fetch(`/api/admin/products/${product.drinkId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formToProduct(productToForm(product))),
          }),
        ),
      );

      if (responses.some((response) => !response.ok)) {
        throw new Error("並び順を保存できませんでした。");
      }

      await reloadStore(storeId);
      setMessage("並び順を保存しました。");
    } catch (error) {
      setCatalogProducts(previousProducts);
      setMessage(error.message || "並び順を保存できませんでした。");
    } finally {
      setIsSavingProductOrder(false);
      setDraggingProductId("");
    }
  };

  const selectCatalogMoveSource = (product) => {
    if (!canReorderCatalog) {
      return;
    }
    if (draggingProductId === product.drinkId) {
      clearCatalogDrag();
      setMessage("");
      return;
    }
    setDraggingProductId(product.drinkId);
    setMessage(`${product.name} の移動先を同じカテゴリ内で選んでください。`);
  };

  const clearCatalogDrag = () => {
    setDraggingProductId("");
  };

  const startNewCategory = () => {
    setEditingCategoryId("");
    setCategoryForm(emptyCategory);
    setMessage("");
  };

  const startEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setCategoryForm(categoryToForm(category));
    setMessage("");
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    setMessage("");
    const isEditing = Boolean(editingCategoryId);
    const response = await fetch(isEditing ? `/api/admin/product-categories/${encodeURIComponent(editingCategoryId)}` : "/api/admin/product-categories", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(categoryForm),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "カテゴリを作成できませんでした。");
      return;
    }
    setCategories((current) =>
      isEditing
        ? current.map((category) => (category.id === editingCategoryId ? body.category : category))
        : [...current, body.category],
    );
    setProductForm((current) => ({ ...current, category: body.category.id }));
    setEditingCategoryId(body.category.id);
    setCategoryForm(categoryToForm(body.category));
    setMessage(isEditing ? "カテゴリを保存しました。" : "カテゴリを追加しました。");
  };

  const removeCategory = async () => {
    if (!editingCategoryId || !window.confirm("このカテゴリを削除します。商品が残っているカテゴリは削除できません。")) {
      return;
    }
    const response = await fetch(`/api/admin/product-categories/${encodeURIComponent(editingCategoryId)}`, {
      method: "DELETE",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "カテゴリを削除できませんでした。");
      return;
    }
    setCategories((current) => current.filter((category) => category.id !== editingCategoryId));
    setEditingCategoryId("");
    setCategoryForm(emptyCategory);
    setMessage("カテゴリを削除しました。");
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
  const groupedStoreMenuItems = useMemo(
    () => [
      {
        id: "option",
        label: "オプション",
        items: storeMenuItems.filter((item) => item.type === "option" && item.id !== "none"),
      },
      {
        id: "topping",
        label: "トッピング",
        items: storeMenuItems.filter((item) => item.type === "topping"),
      },
    ].filter((group) => group.items.length),
    [storeMenuItems],
  );
  const summary = {
    active: products.filter((product) => product.isAvailable && product.websiteEnabled).length,
    stopped: products.filter((product) => !product.isAvailable || !product.websiteEnabled).length,
    optionStopped: storeMenuItems.filter((item) => item.id !== "none" && !item.isAvailable).length,
  };
  const canReorderCatalog = canEditCatalog && !query.trim() && !isSavingProductOrder;

  return (
    <>
      <section className="admin-inline-stats">
        <article>
          <span>販売中</span>
          <strong>{summary.active}</strong>
        </article>
        <article>
          <span>商品停止</span>
          <strong>{summary.stopped}</strong>
        </article>
        <article>
          <span>選択項目停止</span>
          <strong>{summary.optionStopped}</strong>
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
              {(() => {
                const fullGroupProducts = products.filter((product) => product.category === group.id);
                const hasSellingProducts = fullGroupProducts.some((product) => product.isAvailable && product.websiteEnabled);
                const hasPendingProducts = fullGroupProducts.some((product) => savingStoreProductIds.includes(product.drinkId));

                return (
              <div className="admin-product-group-heading">
                <div>
                  <span>{group.id}</span>
                  <h2>{group.label}</h2>
                </div>
                <div className="admin-product-group-actions">
                  <strong>{group.products.length} 件</strong>
                  <button
                    type="button"
                    onClick={() => setProductGroupAvailability(group.id, !hasSellingProducts)}
                    disabled={hasPendingProducts}
                  >
                    {hasSellingProducts ? "系列を不販売" : "系列を販売中に戻す"}
                  </button>
                </div>
              </div>
                );
              })()}
              <div className="admin-product-grid">
                {group.products.map((product) => {
                  const isSavingStoreProduct = savingStoreProductIds.includes(product.drinkId);

                  return (
                    <article className="admin-product-card" key={product.drinkId}>
                      {product.imageUrl ? <img src={normalizeAssetUrl(product.imageUrl)} alt="" /> : null}
                      <div className="admin-product-card-info">
                        <h3>{product.name}</h3>
                        <p>¥{product.effectivePrice}</p>
                      </div>
                      <strong className={`admin-product-state ${product.isAvailable && product.websiteEnabled ? "is-live" : "is-paused"} ${isSavingStoreProduct ? "is-saving" : ""}`}>
                        {isSavingStoreProduct ? "保存中..." : product.isAvailable && product.websiteEnabled ? "販売中" : "不販売"}
                      </strong>
                      <div className="admin-product-switches">
                        <label>
                          <input
                            type="checkbox"
                            checked={product.isAvailable && product.websiteEnabled}
                            disabled={isSavingStoreProduct}
                            onChange={(event) => updateProduct(product.drinkId, { isAvailable: event.target.checked, websiteEnabled: event.target.checked })}
                          />
                          販売中
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
                  );
                })}
              </div>
            </section>
          ))}
          {groupedStoreMenuItems.map((group) => (
            <section className="admin-product-group" key={`store-menu-${group.id}`}>
              <div className="admin-product-group-heading">
                <div>
                  <span>{group.id}</span>
                  <h2>{group.label}</h2>
                </div>
                <div className="admin-product-group-actions">
                  <strong>{group.items.length} 件</strong>
                </div>
              </div>
              <div className="admin-store-menu-item-grid">
                {group.items.map((item) => {
                  const itemKey = `${item.type}/${item.id}`;
                  const isSavingItem = savingStoreMenuItemKeys.includes(itemKey);

                  return (
                    <article className="admin-store-menu-item-card" key={itemKey}>
                      <div>
                        <h3>{item.label}</h3>
                        <p>{item.price ? `${item.price > 0 ? "+" : ""}¥${item.price}` : "追加料金なし"}</p>
                      </div>
                      <strong className={`admin-product-state ${item.isAvailable ? "is-live" : "is-paused"} ${isSavingItem ? "is-saving" : ""}`}>
                        {isSavingItem ? "保存中..." : item.isAvailable ? "販売中" : "不販売"}
                      </strong>
                      <label>
                        <input
                          type="checkbox"
                          checked={item.isAvailable}
                          disabled={isSavingItem}
                          onChange={(event) => updateStoreMenuItem(item, event.target.checked)}
                        />
                        販売中
                      </label>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </section>
      ) : null}

      {tab === "catalog" ? (
        <section className="admin-catalog-layout">
          <section className="admin-panel admin-catalog-list">
            <div className="admin-catalog-list-heading">
              <h2>商品一覧</h2>
              {canEditCatalog ? <small>{query.trim() ? "検索中は並び替えできません" : ":: を押して移動先を選択"}</small> : null}
            </div>
            {visibleCatalogProducts.map((product) => (
              <div
                className={`admin-catalog-list-item ${draggingProductId === product.drinkId ? "is-dragging" : ""} ${product.isActive ? "" : "is-inactive"}`}
                key={product.drinkId}
                data-catalog-product-id={product.drinkId}
              >
                <button
                  type="button"
                  className={`admin-catalog-drag-handle ${draggingProductId === product.drinkId ? "is-selected" : ""}`}
                  aria-label={`${product.name} を移動`}
                  disabled={!canReorderCatalog}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    selectCatalogMoveSource(product);
                  }}
                >
                  ::
                </button>
                <button
                  type="button"
                  className={`admin-catalog-select ${editingId === product.drinkId ? "is-selected" : ""}`}
                  onClick={() => {
                    if (draggingProductId && draggingProductId !== product.drinkId) {
                      reorderCatalogProducts(draggingProductId, product.drinkId);
                      return;
                    }
                    if (draggingProductId === product.drinkId) {
                      clearCatalogDrag();
                      setMessage("");
                      return;
                    }
                    startEditProduct(product);
                  }}
                >
                  <span className="admin-catalog-thumb">
                    {product.imageUrl ? <img src={normalizeAssetUrl(product.imageUrl)} alt="" /> : <span>No image</span>}
                  </span>
                  <span className="admin-catalog-meta">
                    <span className={`admin-catalog-category admin-catalog-category-${categoryAccentIndex(product.category)}`}>
                      {product.categoryLabel || product.category}
                    </span>
                    <strong>{product.name}</strong>
                    <small>{product.isActive ? `¥${product.price}` : "非表示"}</small>
                  </span>
                </button>
                {editingId === product.drinkId ? (
                  <div className="admin-catalog-inline-editor">
                    <ProductEditor
                      editingId={editingId}
                      canEditCatalog={canEditCatalog}
                      productSaveStatus={productSaveStatus}
                      productForm={productForm}
                      setProductForm={setProductForm}
                      categories={categories}
                      settings={settings}
                      saveProduct={saveProduct}
                      removeProduct={removeProduct}
                      closeProductEditor={closeProductEditor}
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
                productSaveStatus={productSaveStatus}
                productForm={productForm}
                setProductForm={setProductForm}
                categories={categories}
                settings={settings}
                saveProduct={saveProduct}
                removeProduct={removeProduct}
                closeProductEditor={closeProductEditor}
                toggleProductArrayValue={toggleProductArrayValue}
                setProductArrayValues={setProductArrayValues}
              />
            </div>
          ) : null}

          <div className="admin-product-editor-side">
            {editingId || isEditingNewProduct ? (
              <ProductEditor
                editingId={editingId}
                canEditCatalog={canEditCatalog}
                productSaveStatus={productSaveStatus}
                productForm={productForm}
                setProductForm={setProductForm}
                categories={categories}
                settings={settings}
                saveProduct={saveProduct}
                removeProduct={removeProduct}
                closeProductEditor={closeProductEditor}
                toggleProductArrayValue={toggleProductArrayValue}
                setProductArrayValues={setProductArrayValues}
              />
            ) : (
              <div className="admin-panel admin-product-editor-empty">
                <h2>商品を選択</h2>
                <p>一覧から商品を選ぶか、「商品を追加」から編集を開始してください。</p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {tab === "categories" ? (
        <section className="admin-catalog-layout">
          <section className="admin-panel admin-category-list">
            <div className="admin-product-editor-heading">
              <h2>カテゴリ一覧</h2>
              <button type="button" className="secondary" onClick={startNewCategory}>新規</button>
            </div>
            {categories.map((category) => (
              <div className="admin-setting-list-item" key={category.id}>
                <article
                  className={`${editingCategoryId === category.id ? "is-selected" : ""} ${category.isActive ? "" : "is-inactive"}`}
                  onClick={() => startEditCategory(category)}
                >
                  <div>
                    <span>{category.id}</span>
                    <strong>{category.label}</strong>
                    {category.note ? <small>{category.note}</small> : null}
                  </div>
                  <small>{category.isActive ? "表示中" : "非表示"}</small>
                </article>
                {editingCategoryId === category.id ? (
                  <div className="admin-catalog-inline-editor">
                    <CategoryEditor
                      canEditCatalog={canEditCatalog}
                      editingCategoryId={editingCategoryId}
                      categoryForm={categoryForm}
                      setCategoryForm={setCategoryForm}
                      saveCategory={saveCategory}
                      removeCategory={removeCategory}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </section>
          <div className="admin-product-editor-side">
            <CategoryEditor
              canEditCatalog={canEditCatalog}
              editingCategoryId={editingCategoryId}
              categoryForm={categoryForm}
              setCategoryForm={setCategoryForm}
              saveCategory={saveCategory}
              removeCategory={removeCategory}
            />
          </div>
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
                  className={`${editingSettingKey === `${item.type}/${item.id}` ? "is-selected" : ""} ${item.isActive ? "" : "is-inactive"}`}
                  onClick={() => startEditSetting(item)}
                >
                  <div>
                    <span>{settingTypeLabels[item.type] || item.type} / {item.id}</span>
                    <strong>{item.values?.length ? item.values.join(", ") : item.label}</strong>
                    {["size", "option", "topping"].includes(item.type) ? <small>¥{item.price}</small> : null}
                  </div>
                  <small>{item.isActive ? "表示中" : "非表示"}</small>
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
