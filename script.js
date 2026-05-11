const header = document.querySelector("[data-header]");
const form = document.querySelector(".reserve-form");
const note = document.querySelector("[data-note]");

const syncHeader = () => {
  header.style.boxShadow =
    window.scrollY > 12 ? "0 12px 36px rgba(0, 0, 0, 0.05)" : "none";
};

window.addEventListener("scroll", syncHeader, { passive: true });
syncHeader();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  note.textContent = `${data.get("pickup")} 受け取り：${data.get("drink")}、${data.get("sweetness")}でご用意します。`;
});
