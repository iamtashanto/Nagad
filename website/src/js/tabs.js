/**
 * Code and Framework Tabs Manager
 */

export function initTabs() {
  document.querySelectorAll("[data-tabs-group]").forEach((group) => {
    const tabButtons = group.querySelectorAll("[data-tab-target]");
    const tabPanels = group.querySelectorAll("[data-tab-panel]");

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.getAttribute("data-tab-target");

        tabButtons.forEach((btn) => {
          btn.setAttribute("aria-selected", "false");
          btn.classList.remove(
            "active-tab",
            "border-teal-500",
            "text-teal-400",
          );
          btn.classList.add("border-transparent", "text-slate-400");
        });

        button.setAttribute("aria-selected", "true");
        button.classList.add("active-tab", "border-teal-500", "text-teal-400");
        button.classList.remove("border-transparent", "text-slate-400");

        tabPanels.forEach((panel) => {
          if (panel.getAttribute("data-tab-panel") === target) {
            panel.classList.remove("hidden");
          } else {
            panel.classList.add("hidden");
          }
        });
      });
    });
  });

  // Package manager synced tabs
  const pmButtons = document.querySelectorAll("[data-pm]");
  pmButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const pm = btn.getAttribute("data-pm");
      localStorage.setItem("preferred-pm", pm);

      pmButtons.forEach((b) => {
        if (b.getAttribute("data-pm") === pm) {
          b.classList.add(
            "bg-teal-500/10",
            "text-teal-400",
            "border-teal-500/30",
          );
          b.classList.remove("text-slate-400", "border-transparent");
        } else {
          b.classList.remove(
            "bg-teal-500/10",
            "text-teal-400",
            "border-teal-500/30",
          );
          b.classList.add("text-slate-400", "border-transparent");
        }
      });

      document.querySelectorAll("[data-pm-snippet]").forEach((snip) => {
        if (snip.getAttribute("data-pm-snippet") === pm) {
          snip.classList.remove("hidden");
        } else {
          snip.classList.add("hidden");
        }
      });
    });
  });

  const savedPm = localStorage.getItem("preferred-pm") || "pnpm";
  const targetPmBtn = document.querySelector(`[data-pm="${savedPm}"]`);
  if (targetPmBtn) {
    targetPmBtn.click();
  }
}
