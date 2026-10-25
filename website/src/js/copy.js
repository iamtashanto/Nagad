/**
 * Copy to Clipboard with Visual Confirmation
 */

export function initCopyButtons() {
  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", async () => {
      const targetId = button.getAttribute("data-copy-target");
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      const text = targetEl.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);

        const originalHtml = button.innerHTML;
        button.innerHTML = `
          <svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span class="text-xs text-teal-400 font-medium">Copied!</span>
        `;
        button.classList.add("bg-teal-500/10");

        setTimeout(() => {
          button.innerHTML = originalHtml;
          button.classList.remove("bg-teal-500/10");
        }, 2000);
      } catch (err) {
        console.error("Failed to copy to clipboard", err);
      }
    });
  });
}
