const header = document.querySelector("[data-header]");
const form = document.querySelector(".reserve-form");
const note = document.querySelector("[data-note]");
const filterButtons = document.querySelectorAll("[data-menu-filter]");
const menuCategories = document.querySelectorAll("[data-menu-category]");

const syncHeader = () => {
  header.style.boxShadow =
    window.scrollY > 12 ? "0 12px 36px rgba(0, 0, 0, 0.05)" : "none";
};

if (header) {
  window.addEventListener("scroll", syncHeader, { passive: true });
  syncHeader();
}

if (form && note) {
  const submitButton = form.querySelector("button[type='submit']");

  if (new URLSearchParams(window.location.search).get("checkout") === "complete") {
    note.textContent = "お支払いありがとうございます。店頭でお名前とSquareの決済画面をご提示ください。";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const order = {
      drink: data.get("drink"),
      sweetness: data.get("sweetness"),
      pickup: data.get("pickup"),
    };

    note.textContent = `${order.pickup} 受け取り：${order.drink}、${order.sweetness}でSquare決済を作成しています。`;
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
