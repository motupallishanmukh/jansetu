/* ============================================================
   Mythwoven app logic — vanilla JS, no frameworks.
   ============================================================ */

(() => {
  // ---------- Storage layer ----------
  const LS = {
    USERS: "mw.users",
    CURRENT: "mw.currentUser",
    THEME: "mw.theme",
    MUTED: "mw.muted",
    user: (uid, key) => `mw.u.${uid}.${key}`,
  };
  const get = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // ---------- State ----------
  let currentUser = null; // {id, username, display}
  let userData = null;    // {progress:{[storyId]:{current, history, completedEndings:[]}}, customStories:[], unlocked:[]}
  let activeStory = null;
  let activeSceneId = null;
  let activeView = "home";

  // ---------- Achievements ----------
  const ACHIEVEMENTS = [
    { id: "first_step", icon: "👣", title: "First Step", desc: "Make your first choice." },
    { id: "first_ending", icon: "📖", title: "The First Ending", desc: "Reach any ending." },
    { id: "explorer", icon: "🧭", title: "Path Explorer", desc: "Reach 3 different endings." },
    { id: "completionist", icon: "🏆", title: "All Roads", desc: "Reach every ending in one story." },
    { id: "weaver", icon: "🪡", title: "The Weaver", desc: "Create a custom story." },
    { id: "scholar", icon: "📚", title: "Scholar", desc: "Begin all built-in stories." },
    { id: "undo", icon: "🔁", title: "Second Thoughts", desc: "Undo a choice." },
    { id: "night_owl", icon: "🌙", title: "Night Owl", desc: "Visit after midnight." },
  ];

  // ---------- Audio (Web Audio API ambient) ----------
  let audioCtx = null;
  function playTone(freq = 440, dur = 0.18, type = "sine", gain = 0.05) {
    if (get(LS.MUTED, false)) return;
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.value = 0; o.connect(g).connect(audioCtx.destination);
      const t = audioCtx.currentTime;
      g.gain.linearRampToValueAtTime(gain, t + 0.02);
      g.gain.linearRampToValueAtTime(0, t + dur);
      o.start(t); o.stop(t + dur + 0.02);
    } catch {}
  }
  const sfx = {
    click: () => playTone(620, 0.08, "triangle", 0.04),
    choose: () => { playTone(523, 0.1, "sine", 0.05); setTimeout(()=>playTone(784,0.14,"sine",0.04),80); },
    ending: () => { [523,659,784,1046].forEach((f,i)=>setTimeout(()=>playTone(f,0.25,"sine",0.05),i*120)); },
    error: () => playTone(180, 0.18, "sawtooth", 0.05),
  };

  // ---------- Toasts ----------
  function toast(msg, kind = "") {
    const stack = document.getElementById("toastStack");
    const el = document.createElement("div");
    el.className = `toast ${kind}`;
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateX(20px)"; }, 2800);
    setTimeout(() => el.remove(), 3300);
  }

  // ---------- Auth ----------
  function loadUser() {
    const id = get(LS.CURRENT);
    if (!id) return null;
    const users = get(LS.USERS, {});
    return users[id] || null;
  }
  function setActiveUser(user) {
    currentUser = user;
    if (user) {
      set(LS.CURRENT, user.id);
      userData = get(LS.user(user.id, "data"), { progress: {}, customStories: [], unlocked: [] });
      document.getElementById("userChip").classList.remove("hidden");
      document.getElementById("openAuthBtn").classList.add("hidden");
      document.getElementById("userName").textContent = user.display;
      document.getElementById("userAvatar").textContent = (user.display || "A").charAt(0).toUpperCase();
    } else {
      localStorage.removeItem(LS.CURRENT);
      // Guest mode
      userData = get("mw.guest.data", { progress: {}, customStories: [], unlocked: [] });
      document.getElementById("userChip").classList.add("hidden");
      document.getElementById("openAuthBtn").classList.remove("hidden");
    }
    rerenderAll();
  }
  function persistUserData() {
    if (currentUser) set(LS.user(currentUser.id, "data"), userData);
    else set("mw.guest.data", userData);
  }

  function signup(display, username, password) {
    const users = get(LS.USERS, {});
    const exists = Object.values(users).some(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) throw new Error("That username is already taken.");
    // simple hashed password — NOT secure, just demo
    const id = "u_" + Math.random().toString(36).slice(2, 10);
    const passHash = btoa(unescape(encodeURIComponent(password + "|" + id))); // demo only
    users[id] = { id, username, display, passHash, createdAt: Date.now() };
    set(LS.USERS, users);
    setActiveUser(users[id]);
  }
  function signin(username, password) {
    const users = get(LS.USERS, {});
    const u = Object.values(users).find(x => x.username.toLowerCase() === username.toLowerCase());
    if (!u) throw new Error("No such account.");
    const passHash = btoa(unescape(encodeURIComponent(password + "|" + u.id)));
    if (passHash !== u.passHash) throw new Error("Incorrect password.");
    setActiveUser(u);
  }
  function signout() {
    setActiveUser(null);
    toast("Signed out.", "");
  }

  // ---------- Stories ----------
  function allStories() {
    return [...window.BUILTIN_STORIES, ...(userData?.customStories || [])];
  }
  function findStory(id) { return allStories().find(s => s.id === id); }

  function storyProgress(storyId) {
    return userData.progress[storyId] || { current: null, history: [], completedEndings: [] };
  }
  function totalEndingsCount(story) {
    return Object.values(story.scenes).filter(s => s.ending).length;
  }

  // ---------- Achievements eval ----------
  function unlockAch(id) {
    if (userData.unlocked.includes(id)) return;
    userData.unlocked.push(id);
    persistUserData();
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (a) toast(`🏆 Achievement: ${a.title}`, "success");
  }
  function evalAchievements() {
    const p = userData.progress;
    const allStoryIds = Object.keys(p);
    const startedBuiltins = window.BUILTIN_STORIES.filter(s => p[s.id]?.history?.length).length;
    const totalEndings = allStoryIds.reduce((n, id) => n + (p[id].completedEndings?.length || 0), 0);

    if (allStoryIds.some(id => p[id].history?.length > 0)) unlockAch("first_step");
    if (totalEndings >= 1) unlockAch("first_ending");
    if (totalEndings >= 3) unlockAch("explorer");
    for (const story of allStories()) {
      const need = totalEndingsCount(story);
      const got = p[story.id]?.completedEndings?.length || 0;
      if (need > 0 && got >= need) unlockAch("completionist");
    }
    if ((userData.customStories || []).length > 0) unlockAch("weaver");
    if (startedBuiltins >= window.BUILTIN_STORIES.length) unlockAch("scholar");
    const h = new Date().getHours();
    if (h >= 0 && h < 5) unlockAch("night_owl");
  }

  // ---------- Navigation ----------
  function goto(view) {
    activeView = view;
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.dataset.view === view));
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === view));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (view === "library") renderLibrary();
    if (view === "achievements") renderAchievements();
    if (view === "builder") renderBuilder();
    if (view === "home") renderHomeStats();
  }

  // ---------- Home stats ----------
  function renderHomeStats() {
    document.getElementById("statStories").textContent = allStories().length;
    const totalEndings = allStories().reduce((n, s) => n + totalEndingsCount(s), 0);
    document.getElementById("statEndings").textContent = totalEndings;
    const reached = Object.values(userData.progress).reduce((n, p) => n + (p.completedEndings?.length || 0), 0);
    const pct = totalEndings === 0 ? 0 : Math.round((reached / totalEndings) * 100);
    document.getElementById("statProgress").textContent = pct + "%";
  }

  // ---------- Library render ----------
  function renderLibrary(filter = "") {
    const grid = document.getElementById("storyGrid");
    const stories = allStories().filter(s => {
      const q = filter.trim().toLowerCase();
      if (!q) return true;
      return s.title.toLowerCase().includes(q) || (s.tagline||"").toLowerCase().includes(q) || (s.mood||"").toLowerCase().includes(q);
    });
    if (!stories.length) { grid.innerHTML = `<div class="empty-state">No tales match. Try the Builder to weave one.</div>`; return; }
    grid.innerHTML = stories.map(s => {
      const prog = storyProgress(s.id);
      const totalE = totalEndingsCount(s);
      const reachedE = prog.completedEndings.length;
      const pct = totalE ? (reachedE / totalE) * 100 : 0;
      const status = prog.history?.length ? (prog.current ? "In progress" : "Awaiting") : "Untouched";
      return `
        <article class="story-card" data-story="${s.id}">
          <div class="story-cover" style="background-image: url('${s.cover || ''}')">
            <span class="story-mood">${s.mood || "Tale"}</span>
          </div>
          <div class="story-info">
            <h3>${escapeHtml(s.title)}</h3>
            <p>${escapeHtml(s.tagline || "")}</p>
            <div class="story-foot">
              <span>${status} · ${reachedE}/${totalE} endings</span>
              <div class="story-progress-mini"><i style="width:${pct}%"></i></div>
            </div>
          </div>
        </article>`;
    }).join("");
    grid.querySelectorAll(".story-card").forEach(c => {
      c.addEventListener("click", () => openStory(c.dataset.story));
    });
  }

  // ---------- Reader ----------
  function openStory(id) {
    const s = findStory(id);
    if (!s) return;
    activeStory = s;
    const prog = storyProgress(id);
    activeSceneId = prog.current && s.scenes[prog.current] ? prog.current : s.start;
    if (!prog.history) prog.history = [];
    userData.progress[id] = prog;
    persistUserData();
    sfx.click();
    goto("reader");
    renderScene();
  }
  function renderScene() {
    const s = activeStory;
    const scene = s.scenes[activeSceneId];
    if (!scene) return;
    document.getElementById("readerTitle").textContent = s.title + " · " + (scene.title || "");
    const img = document.getElementById("sceneImg");
    img.style.backgroundImage = scene.image ? `url('${scene.image}')` : "linear-gradient(135deg, var(--bg-1), var(--bg-2))";
    const titleEl = document.getElementById("sceneTitle");
    const textEl = document.getElementById("sceneText");
    titleEl.textContent = scene.title || "";
    textEl.innerHTML = (scene.text || "").split(/\n+/).map(p => `<p>${escapeHtml(p)}</p>`).join("");

    const reader = document.getElementById("reader");
    reader.classList.remove("scene-fade"); void reader.offsetWidth; reader.classList.add("scene-fade");

    const choicesEl = document.getElementById("choices");
    const endingEl = document.getElementById("endingCard");
    choicesEl.innerHTML = "";
    if (scene.ending) {
      endingEl.classList.remove("hidden");
      document.getElementById("endingTitle").textContent = scene.ending.title;
      document.getElementById("endingDesc").textContent = scene.ending.desc;
      const prog = storyProgress(s.id);
      if (!prog.completedEndings.includes(activeSceneId)) {
        prog.completedEndings.push(activeSceneId);
        sfx.ending();
        toast("✨ New ending discovered: " + scene.ending.title, "success");
      }
      prog.current = null;
      persistUserData();
    } else {
      endingEl.classList.add("hidden");
      (scene.choices || []).forEach((c, i) => {
        const b = document.createElement("button");
        b.className = "choice";
        b.innerHTML = `<span>${escapeHtml(c.label)}</span>`;
        b.addEventListener("click", () => makeChoice(c.to, c.label));
        b.style.animationDelay = (i * 60) + "ms";
        choicesEl.appendChild(b);
      });
    }
    updatePathTrail();
    updateReaderProgress();
    evalAchievements();
  }
  function makeChoice(toId, label) {
    const prog = storyProgress(activeStory.id);
    prog.history.push({ from: activeSceneId, to: toId, label, at: Date.now() });
    prog.current = toId;
    activeSceneId = toId;
    persistUserData();
    sfx.choose();
    renderScene();
  }
  function undoChoice() {
    const prog = storyProgress(activeStory.id);
    if (!prog.history.length) { sfx.error(); toast("No choices to undo.", "error"); return; }
    const last = prog.history.pop();
    activeSceneId = last.from;
    prog.current = activeSceneId;
    persistUserData();
    unlockAch("undo");
    sfx.click();
    renderScene();
  }
  function restartStory() {
    const prog = storyProgress(activeStory.id);
    prog.history = []; prog.current = activeStory.start;
    activeSceneId = activeStory.start;
    persistUserData();
    sfx.click();
    renderScene();
  }
  function updatePathTrail() {
    const list = document.getElementById("pathList");
    const prog = storyProgress(activeStory.id);
    list.innerHTML = prog.history.map(h => `<li>${escapeHtml(h.label)}</li>`).join("") || `<li class="muted">Your choices will appear here…</li>`;
  }
  function updateReaderProgress() {
    const prog = storyProgress(activeStory.id);
    const total = totalEndingsCount(activeStory);
    const reached = prog.completedEndings.length;
    const pct = total ? (reached / total) * 100 : (prog.history.length ? 30 : 5);
    document.getElementById("readerProgress").style.width = pct + "%";
  }

  // ---------- Achievements render ----------
  function renderAchievements() {
    const grid = document.getElementById("achGrid");
    grid.innerHTML = ACHIEVEMENTS.map(a => {
      const got = userData.unlocked.includes(a.id);
      return `<div class="ach ${got ? "unlocked":""}">
        <div class="badge">${a.icon}</div>
        <h4>${a.title}</h4>
        <p>${a.desc}</p>
        <div class="lock">${got ? "Unlocked" : "Locked"}</div>
      </div>`;
    }).join("");
  }

  // ---------- Builder ----------
  let draft = null;
  function freshDraft() {
    return {
      id: "custom_" + Math.random().toString(36).slice(2, 8),
      title: "",
      tagline: "",
      cover: "",
      mood: "Adventure",
      start: "s1",
      scenes: {
        s1: { title: "Opening", text: "", image: "", choices: [{ label: "", to: "" }] }
      }
    };
  }
  function renderBuilder() {
    if (!draft) draft = freshDraft();
    document.getElementById("bTitle").value = draft.title;
    document.getElementById("bTagline").value = draft.tagline;
    document.getElementById("bCover").value = draft.cover;
    document.getElementById("bMood").value = draft.mood;
    const startSel = document.getElementById("bStart");
    startSel.innerHTML = Object.keys(draft.scenes).map(id => `<option ${id===draft.start?"selected":""} value="${id}">${id}</option>`).join("");
    const wrap = document.getElementById("bScenes");
    wrap.innerHTML = "";
    Object.entries(draft.scenes).forEach(([id, sc]) => wrap.appendChild(sceneCard(id, sc)));
  }
  function sceneCard(id, sc) {
    const el = document.createElement("div");
    el.className = "scene-card";
    const isEnding = !!sc.ending;
    el.innerHTML = `
      <div class="scene-card-head">
        <span class="scene-id">#${id}</span>
        <input data-f="title" value="${escapeAttr(sc.title || "")}" placeholder="Scene title" style="flex:1" />
        <label class="is-ending-toggle"><input type="checkbox" data-ending ${isEnding?"checked":""}/> Ending</label>
      </div>
      <div class="row">
        <label>Image URL<input data-f="image" value="${escapeAttr(sc.image||"")}" placeholder="https://… (Unsplash works)"/></label>
        <label>Scene ID<input data-rename value="${escapeAttr(id)}" /></label>
      </div>
      <label>Body<textarea data-f="text" placeholder="Describe the scene…">${escapeHtml(sc.text||"")}</textarea></label>

      <div class="ending-fields ${isEnding?"":"hidden"}">
        <div class="row">
          <label>Ending title<input data-f="endingTitle" value="${escapeAttr(sc.ending?.title||"")}"/></label>
          <label>Ending tagline<input data-f="endingDesc" value="${escapeAttr(sc.ending?.desc||"")}"/></label>
        </div>
      </div>

      <div class="scene-choices ${isEnding?"hidden":""}">
        ${(sc.choices||[]).map((c,i)=>`
          <div class="scene-choice" data-i="${i}">
            <input data-c="label" value="${escapeAttr(c.label||"")}" placeholder="Choice text…"/>
            <select data-c="to">${Object.keys(draft.scenes).map(s=>`<option ${s===c.to?"selected":""}>${s}</option>`).join("")}</select>
            <button class="icon-btn small" data-act="rmChoice" title="Remove">✕</button>
          </div>`).join("")}
        <div class="scene-actions">
          <button class="btn ghost small" data-act="addChoice">+ Choice</button>
        </div>
      </div>

      <div class="scene-actions">
        <button class="btn ghost small" data-act="rmScene">Delete scene</button>
      </div>
    `;
    // bindings
    el.querySelectorAll("[data-f]").forEach(input => {
      input.addEventListener("input", () => {
        const f = input.dataset.f;
        if (f === "endingTitle" || f === "endingDesc") {
          sc.ending = sc.ending || { title: "", desc: "" };
          sc.ending[f === "endingTitle" ? "title" : "desc"] = input.value;
        } else {
          sc[f] = input.value;
        }
      });
    });
    el.querySelector("[data-ending]").addEventListener("change", e => {
      if (e.target.checked) { sc.ending = sc.ending || { title: "An Ending", desc: "" }; sc.choices = []; }
      else { delete sc.ending; sc.choices = sc.choices || [{label:"",to:Object.keys(draft.scenes)[0]}]; }
      renderBuilder();
    });
    el.querySelector("[data-rename]").addEventListener("change", e => {
      const newId = (e.target.value || "").trim();
      if (!newId || newId === id) return;
      if (draft.scenes[newId]) { toast("Scene ID already exists.", "error"); e.target.value = id; return; }
      draft.scenes[newId] = sc; delete draft.scenes[id];
      // update references
      Object.values(draft.scenes).forEach(s => (s.choices||[]).forEach(c => { if (c.to === id) c.to = newId; }));
      if (draft.start === id) draft.start = newId;
      renderBuilder();
    });
    el.querySelectorAll(".scene-choice").forEach(row => {
      const i = +row.dataset.i;
      row.querySelectorAll("[data-c]").forEach(inp => {
        inp.addEventListener("input", () => { sc.choices[i][inp.dataset.c] = inp.value; });
      });
      row.querySelector("[data-act='rmChoice']").addEventListener("click", () => {
        sc.choices.splice(i,1); renderBuilder();
      });
    });
    el.querySelectorAll("[data-act='addChoice']").forEach(b => b.addEventListener("click", () => {
      sc.choices = sc.choices || [];
      sc.choices.push({ label: "", to: Object.keys(draft.scenes)[0] });
      renderBuilder();
    }));
    el.querySelector("[data-act='rmScene']").addEventListener("click", () => {
      if (Object.keys(draft.scenes).length <= 1) { toast("Need at least one scene.", "error"); return; }
      delete draft.scenes[id];
      if (draft.start === id) draft.start = Object.keys(draft.scenes)[0];
      renderBuilder();
    });
    return el;
  }

  function builderAddScene() {
    let i = Object.keys(draft.scenes).length + 1;
    while (draft.scenes["s"+i]) i++;
    const id = "s"+i;
    draft.scenes[id] = { title: "Untitled", text: "", image: "", choices: [{label:"",to:draft.start}] };
    renderBuilder();
    sfx.click();
  }
  function validateDraft() {
    if (!draft.title.trim()) throw new Error("Story needs a title.");
    if (!draft.scenes[draft.start]) throw new Error("Start scene is missing.");
    for (const [id, sc] of Object.entries(draft.scenes)) {
      if (!sc.ending) {
        for (const c of (sc.choices||[])) {
          if (!c.label.trim()) throw new Error(`Scene "${id}" has an empty choice label.`);
          if (!draft.scenes[c.to]) throw new Error(`Scene "${id}" links to missing scene "${c.to}".`);
        }
      }
    }
  }
  function builderSave() {
    try {
      // sync meta
      draft.title = document.getElementById("bTitle").value.trim();
      draft.tagline = document.getElementById("bTagline").value.trim();
      draft.cover = document.getElementById("bCover").value.trim();
      draft.mood = document.getElementById("bMood").value;
      draft.start = document.getElementById("bStart").value;
      validateDraft();
      userData.customStories = userData.customStories || [];
      const idx = userData.customStories.findIndex(s => s.id === draft.id);
      if (idx >= 0) userData.customStories[idx] = draft; else userData.customStories.push(draft);
      persistUserData();
      evalAchievements();
      toast("Saved to your library.", "success");
      sfx.choose();
      draft = freshDraft();
      renderBuilder();
    } catch (e) {
      toast(e.message, "error"); sfx.error();
    }
  }
  function builderExport() {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (draft.title || "story") + ".json";
    a.click();
  }
  function builderImport(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data.scenes || !data.start) throw new Error("Not a valid story file.");
        draft = data;
        renderBuilder();
        toast("Story loaded into builder.", "success");
      } catch (e) { toast(e.message, "error"); sfx.error(); }
    };
    r.readAsText(file);
  }

  // ---------- Helpers ----------
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
  function escapeAttr(s) { return escapeHtml(s); }

  // ---------- Starfield ----------
  function startStarfield() {
    const c = document.getElementById("starfield");
    const ctx = c.getContext("2d");
    let stars = [];
    function resize() {
      c.width = window.innerWidth; c.height = window.innerHeight;
      stars = Array.from({length: 110}, () => ({
        x: Math.random()*c.width, y: Math.random()*c.height,
        r: Math.random()*1.4 + .2, s: Math.random()*0.4 + 0.05,
        a: Math.random()*0.6 + 0.2
      }));
    }
    resize(); window.addEventListener("resize", resize);
    function frame() {
      ctx.clearRect(0,0,c.width,c.height);
      for (const st of stars) {
        st.y += st.s; if (st.y > c.height) st.y = 0;
        ctx.globalAlpha = st.a;
        ctx.fillStyle = "#fff8e0";
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI*2); ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    frame();
  }

  // ---------- Theme ----------
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    set(LS.THEME, t);
  }
  function toggleTheme() {
    const cur = document.documentElement.dataset.theme || "dark";
    applyTheme(cur === "dark" ? "light" : "dark");
    sfx.click();
  }

  // ---------- Wire-up ----------
  function rerenderAll() {
    if (activeView === "library") renderLibrary(document.getElementById("storySearch").value);
    if (activeView === "achievements") renderAchievements();
    if (activeView === "home") renderHomeStats();
  }

  function bindUI() {
    document.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => goto(b.dataset.goto)));
    document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => { sfx.click(); goto(t.dataset.view); }));

    document.getElementById("themeToggle").addEventListener("click", toggleTheme);
    document.getElementById("muteToggle").addEventListener("click", () => {
      const m = !get(LS.MUTED, false);
      set(LS.MUTED, m);
      toast(m ? "Sound muted." : "Sound on.", "");
    });

    // Auth modal
    const modal = document.getElementById("authModal");
    document.getElementById("openAuthBtn").addEventListener("click", () => { modal.classList.remove("hidden"); sfx.click(); });
    document.getElementById("authClose").addEventListener("click", () => modal.classList.add("hidden"));
    modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });
    document.querySelectorAll(".auth-tab").forEach(t => t.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab").forEach(x => x.classList.toggle("active", x === t));
      const which = t.dataset.auth;
      document.getElementById("signinForm").classList.toggle("hidden", which !== "signin");
      document.getElementById("signupForm").classList.toggle("hidden", which !== "signup");
    }));
    document.getElementById("signupForm").addEventListener("submit", e => {
      e.preventDefault();
      const f = e.target;
      try {
        signup(f.display.value.trim(), f.username.value.trim(), f.password.value);
        modal.classList.add("hidden");
        toast("Welcome, " + currentUser.display + ".", "success");
        sfx.choose();
      } catch (err) { document.getElementById("signupError").textContent = err.message; sfx.error(); }
    });
    document.getElementById("signinForm").addEventListener("submit", e => {
      e.preventDefault();
      const f = e.target;
      try {
        signin(f.username.value.trim(), f.password.value);
        modal.classList.add("hidden");
        toast("Welcome back, " + currentUser.display + ".", "success");
        sfx.choose();
      } catch (err) { document.getElementById("signinError").textContent = err.message; sfx.error(); }
    });
    document.getElementById("logoutBtn").addEventListener("click", signout);

    // Library search
    document.getElementById("storySearch").addEventListener("input", e => renderLibrary(e.target.value));

    // Reader
    document.getElementById("undoBtn").addEventListener("click", undoChoice);
    document.getElementById("restartBtn").addEventListener("click", restartStory);
    document.getElementById("endingRestart").addEventListener("click", restartStory);

    // Builder
    document.getElementById("builderNewScene").addEventListener("click", builderAddScene);
    document.getElementById("builderSave").addEventListener("click", builderSave);
    document.getElementById("builderExport").addEventListener("click", builderExport);
    document.getElementById("builderImport").addEventListener("click", () => document.getElementById("builderImportFile").click());
    document.getElementById("builderImportFile").addEventListener("change", e => {
      if (e.target.files[0]) builderImport(e.target.files[0]);
    });
    ["bTitle","bTagline","bCover","bMood","bStart"].forEach(id => {
      document.getElementById(id).addEventListener("change", e => {
        const map = { bTitle:"title", bTagline:"tagline", bCover:"cover", bMood:"mood", bStart:"start" };
        draft[map[id]] = e.target.value;
      });
    });

    // Achievements reset
    document.getElementById("resetProgress").addEventListener("click", () => {
      if (!confirm("Erase all your progress and unlocked achievements?")) return;
      userData.progress = {}; userData.unlocked = [];
      persistUserData();
      renderAchievements(); renderHomeStats();
      toast("Progress reset.", "");
    });

    // Keyboard: number keys pick choices
    window.addEventListener("keydown", e => {
      if (activeView !== "reader") return;
      if (/^[1-9]$/.test(e.key)) {
        const choices = document.querySelectorAll("#choices .choice");
        const idx = +e.key - 1;
        if (choices[idx]) choices[idx].click();
      }
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undoChoice(); }
    });
  }

  // ---------- Boot ----------
  function boot() {
    applyTheme(get(LS.THEME, "dark"));
    bindUI();
    startStarfield();
    const u = loadUser();
    setActiveUser(u);
    goto("home");
    evalAchievements();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
