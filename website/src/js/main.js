import { initTheme } from "./theme.js";
import { initLanguage } from "./lang.js";
import { initTabs } from "./tabs.js";
import { initCopyButtons } from "./copy.js";

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initLanguage();
  initTabs();
  initCopyButtons();

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener("click", () => {
      const isHidden = mobileMenu.classList.toggle("hidden");
      mobileMenuBtn.setAttribute("aria-expanded", !isHidden);
    });
  }
});
