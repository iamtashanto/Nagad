/**
 * Language Switcher: English / Bangla (bn)
 */

export function initLanguage() {
  const toggleBtn = document.getElementById("lang-toggle-btn");
  if (!toggleBtn) return;

  function applyLanguage(lang) {
    document.documentElement.lang = lang;
    localStorage.setItem("lang", lang);

    document.querySelectorAll("[data-lang-en]").forEach((el) => {
      const enText = el.getAttribute("data-lang-en");
      const bnText = el.getAttribute("data-lang-bn");
      if (lang === "bn" && bnText) {
        el.textContent = bnText;
      } else if (enText) {
        el.textContent = enText;
      }
    });

    const langTextEl = toggleBtn.querySelector(".lang-label");
    if (langTextEl) {
      langTextEl.textContent = lang === "bn" ? "English" : "বাংলা";
    }
    toggleBtn.setAttribute(
      "aria-label",
      lang === "bn" ? "Switch to English" : "বাংলায় দেখুন",
    );
  }

  const savedLang = localStorage.getItem("lang") || "en";
  if (savedLang === "bn") {
    applyLanguage("bn");
  }

  toggleBtn.addEventListener("click", () => {
    const currentLang = document.documentElement.lang === "bn" ? "bn" : "en";
    const nextLang = currentLang === "bn" ? "en" : "bn";
    applyLanguage(nextLang);
  });
}
