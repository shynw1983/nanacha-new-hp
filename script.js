const header = document.querySelector("[data-header]");
const form = document.querySelector(".reserve-form");
const note = document.querySelector("[data-note]");
const filterButtons = document.querySelectorAll("[data-menu-filter]");
const menuCategories = document.querySelectorAll("[data-menu-category]");
const orderData = window.NANACHA_MENU;

const syncHeader = () => {
  header.style.boxShadow =
    window.scrollY > 12 ? "0 12px 36px rgba(0, 0, 0, 0.05)" : "none";
};

if (header) {
  window.addEventListener("scroll", syncHeader, { passive: true });
  syncHeader();
}

const formatPrice = (price) => `¥${price.toLocaleString("ja-JP")}`;

const formatDelta = (price) => {
  if (price === 0) {
    return "¥0";
  }

  return `${price > 0 ? "+" : "-"}${formatPrice(Math.abs(price))}`;
};

const findById = (items, id) => items.find((item) => item.id === id);

const isTapiocaFreeCategory = (category) => orderData.tapiocaFreeCategories.includes(category);

const hasWhipByDefault = (category) => orderData.whippedCategories.includes(category);

const getAvailableToppings = (category) =>
  orderData.toppings.filter(
    (topping) =>
      !(topping.id === "no-tapioca" && isTapiocaFreeCategory(category)) &&
      !(topping.id === "no-whip" && !hasWhipByDefault(category)),
  );

const getSelectedOrder = () => {
  const data = new FormData(form);
  const drinkName = String(data.get("drink") || "");
  const drink = orderData.drinks.find((item) => item.name === drinkName);
  const size = findById(orderData.sizes, String(data.get("size") || ""));
  const selectedOption = findById(orderData.options, String(data.get("option") || ""));
  const toppingIds = data.getAll("toppings").map(String);
  const availableToppings = getAvailableToppings(drink?.category || "");
  const toppings = toppingIds.map((id) => findById(availableToppings, id)).filter(Boolean);
  const total =
    (drink?.price || 0) +
    (size?.price || 0) +
    (selectedOption?.price || 0) +
    toppings.reduce((sum, item) => sum + item.price, 0);

  return {
    drink: drinkName,
    category: String(data.get("category") || ""),
    size: String(data.get("size") || ""),
    sweetness: String(data.get("sweetness") || ""),
    ice: String(data.get("ice") || ""),
    option: String(data.get("option") || ""),
    toppings: toppingIds,
    pickup: String(data.get("pickup") || ""),
    total,
    labels: {
      drink: drink?.name || drinkName,
      size: size?.label || "",
      option: selectedOption?.label || "",
      toppings: toppings.map((item) => item.label),
    },
  };
};

const updateOrderTotal = () => {
  const total = document.querySelector("[data-order-total]");

  if (!total || !orderData) {
    return;
  }

  const order = getSelectedOrder();
  total.textContent = `合計 ${formatPrice(order.total)}`;
};

const fillSelect = (select, options) => {
  select.innerHTML = options.map((option) => `<option value="${option.value}">${option.label}</option>`).join("");
};

if (form && note && orderData) {
  const submitButton = form.querySelector("button[type='submit']");
  const categorySelect = form.querySelector("[data-category-select]");
  const drinkSelect = form.querySelector("[data-drink-select]");
  const sizeSelect = form.querySelector("[data-size-select]");
  const sweetnessSelect = form.querySelector("[data-sweetness-select]");
  const iceSelect = form.querySelector("[data-ice-select]");
  const optionSelect = form.querySelector("[data-option-select]");
  const toppingList = form.querySelector("[data-topping-list]");

  const syncToppings = () => {
    const category = categorySelect.value;
    const availableToppings = getAvailableToppings(category);

    toppingList.innerHTML = availableToppings
      .map(
        (topping) => `
          <label>
            <input type="checkbox" name="toppings" value="${topping.id}" />
            <span>${topping.label} (${formatDelta(topping.price)})</span>
          </label>
        `,
      )
      .join("");
  };

  const syncDrinks = () => {
    const category = categorySelect.value;
    const drinks = orderData.drinks.filter((drink) => drink.category === category);

    fillSelect(
      drinkSelect,
      drinks.map((drink) => ({
        value: drink.name,
        label: `${drink.name} ${formatPrice(drink.price)}`,
      })),
    );
    syncToppings();
    updateOrderTotal();
  };

  fillSelect(
    categorySelect,
    orderData.categories.map((category) => ({ value: category.id, label: category.label })),
  );
  fillSelect(
    sizeSelect,
    orderData.sizes.map((size) => ({
      value: size.id,
      label: `${size.label} (${formatDelta(size.price)})`,
    })),
  );
  fillSelect(
    sweetnessSelect,
    orderData.sweetness.map((item) => ({ value: item, label: item })),
  );
  fillSelect(
    iceSelect,
    orderData.ice.map((item) => ({ value: item, label: item })),
  );
  fillSelect(
    optionSelect,
    orderData.options.map((option) => ({
      value: option.id,
      label: `${option.label} (${formatDelta(option.price)})`,
    })),
  );
  categorySelect.value = "milk";
  syncDrinks();

  form.addEventListener("change", (event) => {
    if (event.target === categorySelect) {
      syncDrinks();
      return;
    }

    updateOrderTotal();
  });

  if (new URLSearchParams(window.location.search).get("checkout") === "complete") {
    note.textContent = "お支払いありがとうございます。店頭でお名前とSquareの決済画面をご提示ください。";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const order = getSelectedOrder();

    note.textContent = `${order.pickup} 受け取り：${order.drink}、${order.labels.size}、${order.sweetness}、${order.ice}、合計${formatPrice(order.total)}でSquare決済を作成しています。`;
    submitButton.disabled = true;
    submitButton.textContent = "決済画面を作成中...";

    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(order),
      });
      const result = await response.json();

      if (!response.ok || !result.checkoutUrl) {
        const error = new Error(result.error || "Checkout failed");
        error.code = result.code;
        throw error;
      }

      window.location.href = result.checkoutUrl;
    } catch (error) {
      note.textContent =
        error.code === "SQUARE_NOT_CONFIGURED"
          ? "Square設定が未完了です。店舗側でVercelの環境変数を設定してください。"
          : "決済画面を作成できませんでした。時間をおいて再度お試しください。";
      submitButton.disabled = false;
      submitButton.textContent = "Squareで注文・支払い";
    }
  });
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.menuFilter;

    filterButtons.forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });

    menuCategories.forEach((category) => {
      const isVisible = filter === "all" || category.dataset.menuCategory === filter;
      category.classList.toggle("is-hidden", !isVisible);
    });
  });
});
