"use strict";
// Visibility is session-only. Never rebuild article inputs or call an API here.
(() => {
  const sections = new Map();
  for (const id of ["verification-results", "rewrite-panel", "final-panel"]) {
    const section = document.getElementById(id);
    const header = section.querySelector(".collapse-header");
    const button = header.querySelector(".section-toggle");
    const body = document.getElementById(id + "-body");
    function setOpen(open) {
      body.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
      button.querySelector(".collapse-arrow").textContent = open ? "▼" : "▶";
    }
    sections.set(id, setOpen);
    button.addEventListener("click", () => setOpen(body.hidden));
    header.addEventListener("click", event => {
      if (!event.target.closest("button, a, input, select, textarea")) setOpen(body.hidden);
    });
  }
  window.expandEditorSection = id => sections.get(id)?.(true);
  // Existing navigation handlers still perform the scrolling.
  for (const [id, target] of [["nav-rewrite", "rewrite-panel"], ["nav-final", "final-panel"], ["edit-draft", "rewrite-panel"]]) {
    document.getElementById(id).addEventListener("click", () => window.expandEditorSection(target), true);
  }
  function watchSummary(targetId, sourceIds, read) {
    const target = document.getElementById(targetId);
    const update = () => {
      const value = read();
      if (target.textContent !== value) target.textContent = value;
    };
    const observer = new MutationObserver(update);
    for (const id of sourceIds) observer.observe(document.getElementById(id), {
      childList: true, subtree: true, characterData: true
    });
    update();
  }
  const text = id => document.getElementById(id).textContent.trim();
  const counts = id => Array.from(document.querySelectorAll("#" + id + " .verdict-counts > span"), el => el.textContent).join(" / ");
  watchSummary("verification-results-summary", ["verification-status", "verification-meta"],
    () => [text("verification-status"), counts("verification-meta")].filter(Boolean).join(" · "));
  watchSummary("rewrite-panel-summary", ["decision-summary"], () => text("decision-summary"));
  watchSummary("final-panel-summary", ["final-meta"], () => counts("final-meta"));
})();
