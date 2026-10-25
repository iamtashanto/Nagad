/**
 * Theme Manager: Dark / Light Mode with System Preference & No-Flash Inline Execution
 */

export function initTheme() {
  const toggleBtn = document.getElementById("theme-toggle-btn");
  if (!toggleBtn) return;

  function updateAria(isDark) {
    toggleBtn.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode",
    );
  }

  const isDark = document.documentElement.classList.contains("dark");
  updateAria(isDark);

  toggleBtn.addEventListener("click", () => {
    const currentlyDark = document.documentElement.classList.contains("dark");
    if (currentlyDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      updateAria(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      updateAria(true);
    }
  });
}
