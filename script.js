// =========================================================
// POWER LEVEL — DBZ-inspired personal site template
// Scouter power counter, stat bar fill, scroll reveals
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  footerYear();
  setupScouter(prefersReducedMotion);
  setupRevealOnScroll(prefersReducedMotion);
});

/* ---------------- Footer year ---------------- */

function footerYear() {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/* ---------------- Scouter power-level counter ---------------- */

function setupScouter(prefersReducedMotion) {
  const valueEl = document.getElementById("scouterValue");
  const classEl = document.getElementById("scouterClass");
  const btn = document.getElementById("powerBtn");
  if (!valueEl || !classEl || !btn) return;

  // Maps a scanned reading to a Z-Fighter. Edit freely — add characters,
  // change the cutoffs, whatever fits your own roster.
  const classifications = [
    { max: 150, label: "you're a Saibaman" },
    { max: 1200, label: "you're Krillin" },
    { max: 3000, label: "you're Gohan (suppressed)" },
    { max: 4000, label: "you're Piccolo" },
    { max: 6000, label: "you're Goku (base form)" },
    { max: 8000, label: "you're Vegeta (Super Saiyan)" },
    { max: 9000, label: "you're Goku (Super Saiyan)" },
    { max: Infinity, label: "IT'S OVER 9000 — Broly-tier" },
  ];

  function classify(n) {
    return classifications.find((c) => n <= c.max).label;
  }

  function runScan() {
    btn.disabled = true;
    btn.textContent = "Scanning...";
    valueEl.classList.remove("overload");

    // Occasionally breaks past 9000 for the classic gag.
    const target = Math.floor(Math.random() * 9400) + 100; // 100–9500
    const duration = prefersReducedMotion ? 0 : 1400;

    if (duration === 0) {
      finish(target);
      return;
    }

    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out so the count slams to a stop rather than ticking evenly
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);

      valueEl.textContent = current.toLocaleString();
      classEl.textContent = classify(current);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        finish(target);
      }
    }

    requestAnimationFrame(tick);
  }

  function finish(target) {
    valueEl.textContent = target.toLocaleString();
    classEl.textContent = classify(target);
    if (target > 8000) valueEl.classList.add("overload");
    btn.disabled = false;
    btn.textContent = "Scan Again";
  }

  btn.addEventListener("click", runScan);
}

/* ---------------- Scroll-triggered reveals ---------------- */

function setupRevealOnScroll(prefersReducedMotion) {
  const revealEls = document.querySelectorAll(".reveal");
  const statFills = document.querySelectorAll(".stat-fill");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("in-view"));
    statFills.forEach((el) => el.classList.add("filled"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  revealEls.forEach((el) => observer.observe(el));

  // Stat bars fill once the panel scrolls into view
  const statPanel = document.querySelector(".stat-panel");
  if (statPanel) {
    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            statFills.forEach((el) => el.classList.add("filled"));
            statObserver.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    statObserver.observe(statPanel);
  }
}
