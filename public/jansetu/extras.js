/* JanSetu — Extras: footer behavior, shortcuts, connectivity, back-to-top, newsletter */
(function () {
  "use strict";

  // ---- Year ----
  const yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  // ---- Duplicate ticker content for seamless loop ----
  const track = document.querySelector(".ticker-track");
  if (track) track.innerHTML += track.innerHTML;

  // ---- Footer quick-link routing (delegates to existing app) ----
  document.querySelectorAll(".footer [data-route]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const r = a.getAttribute("data-route");
      // Re-use existing nav buttons in the appbar so route guards still apply
      const navBtn = document.querySelector(`.nav button[data-route="${r}"]`);
      if (navBtn) navBtn.click();
    });
  });

  // ---- Newsletter (local only) ----
  const nf = document.getElementById("newsletterForm");
  if (nf) {
    nf.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("newsEmail").value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast("Please enter a valid email");
        return;
      }
      const list = JSON.parse(localStorage.getItem("jansetu.newsletter") || "[]");
      if (!list.includes(email)) list.push(email);
      localStorage.setItem("jansetu.newsletter", JSON.stringify(list));
      nf.reset();
      showToast("✓ Subscribed for monthly civic updates");
    });
  }

  // ---- Export local data ----
  const expBtn = document.getElementById("exportData");
  if (expBtn) {
    expBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const dump = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("jansetu")) dump[k] = localStorage.getItem(k);
      }
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jansetu-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("📦 Exported your local JanSetu data");
    });
  }

  // ---- Clear local data ----
  const clrBtn = document.getElementById("clearData");
  if (clrBtn) {
    clrBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!confirm("Clear ALL JanSetu data on this device? This signs you out and removes reports stored locally.")) return;
      Object.keys(localStorage)
        .filter((k) => k.startsWith("jansetu"))
        .forEach((k) => localStorage.removeItem(k));
      showToast("🧹 Local data cleared");
      setTimeout(() => location.reload(), 700);
    });
  }

  // ---- Back to top ----
  const toTop = document.getElementById("toTop");
  if (toTop) {
    window.addEventListener("scroll", () => {
      toTop.hidden = window.scrollY < 320;
    });
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  // ---- Connectivity badge ----
  const net = document.getElementById("netBadge");
  function updateNet() {
    if (!net) return;
    if (navigator.onLine) {
      net.textContent = "● Online";
      net.classList.add("online");
      net.hidden = false;
      setTimeout(() => (net.hidden = true), 2200);
    } else {
      net.textContent = "● Offline — reports save locally";
      net.classList.remove("online");
      net.hidden = false;
    }
  }
  window.addEventListener("online", updateNet);
  window.addEventListener("offline", updateNet);
  if (!navigator.onLine) updateNet();

  // ---- Shortcuts modal ----
  const sc = document.getElementById("shortcuts");
  const openSc = document.getElementById("openShortcuts");
  const closeSc = document.getElementById("closeShortcuts");
  function showSc() { if (sc) sc.hidden = false; }
  function hideSc() { if (sc) sc.hidden = true; }
  if (openSc) openSc.addEventListener("click", showSc);
  if (closeSc) closeSc.addEventListener("click", hideSc);
  if (sc) sc.addEventListener("click", (e) => { if (e.target === sc) hideSc(); });

  // ---- Keyboard shortcuts ----
  let leader = false, leaderTimer = null;
  function clickRoute(r) {
    const b = document.querySelector(`.nav button[data-route="${r}"]`);
    if (b) b.click();
  }
  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    if (["input", "textarea", "select"].includes(tag) || e.target.isContentEditable) return;

    if (e.key === "Escape") { hideSc(); return; }
    if (e.key === "?") { e.preventDefault(); showSc(); return; }
    if (e.key === "t" || e.key === "T") {
      const tb = document.getElementById("themeBtn");
      if (tb) tb.click();
      return;
    }
    if (e.key === "/") {
      const search = document.querySelector('#view input[type="search"], #view input[placeholder*="earch" i]');
      if (search) { e.preventDefault(); search.focus(); }
      return;
    }
    if (e.key === "g" || e.key === "G") {
      leader = true;
      clearTimeout(leaderTimer);
      leaderTimer = setTimeout(() => (leader = false), 1200);
      return;
    }
    if (leader) {
      const map = { h: "home", r: "report", t: "track", f: "feed", d: "dash", a: "about" };
      const route = map[e.key.toLowerCase()];
      if (route) { clickRoute(route); leader = false; }
    }
  });

  // ---- Toast helper (uses existing #toast) ----
  function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => (t.hidden = true), 2400);
  }
})();
