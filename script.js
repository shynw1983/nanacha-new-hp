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
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    note.textContent = `${data.get("pickup")} 受け取り：${data.get("drink")}、${data.get("sweetness")}でご用意します。`;
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
