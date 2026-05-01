/* JanSetu — Civic Issue Reporting System
   Pure vanilla JS. State machine + localStorage persistence. */

(() => {
  const { STATES, DISTRICTS, CATEGORIES, PRIORITY_COLORS, STATUSES } = window.JANSETU_DATA;

  // ---------- Storage ----------
  const LS = {
    get(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
  };
  const KEYS = {
    users:"js_users", session:"js_session", reports:"js_reports",
    upvotes:"js_upvotes", theme:"js_theme", lang:"js_lang", official:"js_official"
  };
  const state = {
    users: LS.get(KEYS.users, []),
    session: LS.get(KEYS.session, null),
    official: LS.get(KEYS.official, null),
    reports: LS.get(KEYS.reports, []),
    upvotes: LS.get(KEYS.upvotes, {}),
    theme: LS.get(KEYS.theme, "light"),
    lang: LS.get(KEYS.lang, "en"),
    route: "home",
    draftMedia: []
  };
  const save = () => {
    LS.set(KEYS.users, state.users);
    LS.set(KEYS.session, state.session);
    LS.set(KEYS.official, state.official);
    LS.set(KEYS.reports, state.reports);
    LS.set(KEYS.upvotes, state.upvotes);
    LS.set(KEYS.theme, state.theme);
    LS.set(KEYS.lang, state.lang);
  };

  // ---------- Seed demo data ----------
  if (!state.reports.length) {
    const samples = [
      ["roads","Pothole near bus stop","Large pothole causing accidents on main road","Karnataka","Bengaluru","Submitted"],
      ["streetlight","Lane streetlight off for 5 days","Entire lane is dark since Monday night","Maharashtra","Mumbai","Acknowledged"],
      ["garbage","Garbage overflow at corner","Bin not cleared since festival","Tamil Nadu","Chennai","In Progress"],
      ["water","No water supply since 3 days","Apartment of 40 flats affected","Delhi","South Delhi","Resolved"],
      ["drainage","Open manhole near school","Children at risk, urgent","Uttar Pradesh","Lucknow","Submitted"],
      ["power","Frequent power cuts evening","2-hour cuts daily 7-9pm","Bihar","Patna","Acknowledged"],
      ["traffic","Signal blinking yellow","Junction unsafe in peak hours","Telangana","Hyderabad","In Progress"],
      ["pollution","Factory smoke complaint","Heavy black smoke at night","Gujarat","Surat","Submitted"]
    ];
    state.reports = samples.map((s,i) => mkReport({
      categoryId:s[0], title:s[1], description:s[2], state:s[3], district:s[4],
      address:"Reported area", status:s[5], userId:"demo", userName:"Citizen "+(i+1),
      createdAt: Date.now() - (i+1)*86400000*2
    }));
    save();
  }

  function mkReport(r){
    const cat = CATEGORIES.find(c=>c.id===r.categoryId);
    return {
      id: "JS-" + Math.random().toString(36).slice(2,8).toUpperCase(),
      categoryId: r.categoryId, title: r.title, description: r.description,
      state: r.state, district: r.district, address: r.address || "",
      lat: r.lat||null, lng: r.lng||null,
      photos: r.photos||[], audio: r.audio||null,
      status: r.status || "Submitted",
      department: cat.dept, priority: cat.priority, sla: cat.sla,
      userId: r.userId, userName: r.userName,
      createdAt: r.createdAt || Date.now(),
      updates: r.updates || [{ at: r.createdAt||Date.now(), status:"Submitted", note:"Report logged."}]
    };
  }

  // ---------- i18n ----------
  const I18N = {
    en: { home:"Home", report:"Report", track:"My Reports", feed:"Live Feed", dash:"Officials", about:"About",
          tag:"Empower your city. Report issues. Track resolutions.",
          sub:"JanSetu connects every Indian citizen to the right municipal department — instantly.",
          start:"Report an Issue", learn:"How it works" },
    hi: { home:"होम", report:"रिपोर्ट", track:"मेरी रिपोर्ट", feed:"लाइव फ़ीड", dash:"अधिकारी", about:"परिचय",
          tag:"अपने शहर को सशक्त बनाएं। समस्याओं की रिपोर्ट करें।",
          sub:"JanSetu हर भारतीय नागरिक को सही नगर निगम विभाग से तुरंत जोड़ता है।",
          start:"समस्या दर्ज करें", learn:"कैसे काम करता है" },
    ta: { home:"முகப்பு", report:"புகார்", track:"எனது புகார்கள்", feed:"நேரடி", dash:"அதிகாரிகள்", about:"பற்றி",
          tag:"உங்கள் நகரை வலுப்படுத்துங்கள்.", sub:"JanSetu ஒவ்வொரு குடிமகனையும் சரியான துறையுடன் இணைக்கிறது.",
          start:"புகார் பதிவு", learn:"எப்படி செயல்படுகிறது" }
  };
  const t = (k) => (I18N[state.lang] && I18N[state.lang][k]) || I18N.en[k] || k;

  // ---------- Helpers ----------
  const $ = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
  const escapeHtml = s => String(s||"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmtTime = ts => {
    const d = Date.now()-ts;
    if (d<60000) return "just now";
    if (d<3600000) return Math.floor(d/60000)+"m ago";
    if (d<86400000) return Math.floor(d/3600000)+"h ago";
    if (d<2592000000) return Math.floor(d/86400000)+"d ago";
    return new Date(ts).toLocaleDateString();
  };
  const cat = id => CATEGORIES.find(c=>c.id===id);
  const toast = (msg, ms=2400) => {
    const el = $("#toast"); el.textContent = msg; el.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(()=>el.hidden=true, ms);
  };
  const priorityBadge = p => `<span class="badge ${p==='critical'?'crit':p==='high'?'hi':p==='medium'?'md':'lo'}">${p}</span>`;
  const statusBadge = s => `<span class="badge st-${s.replace(/\s/g,'')}">${s}</span>`;

  // ---------- Routing ----------
  const VIEWS = {
    home: viewHome, report: viewReport, track: viewTrack, feed: viewFeed,
    dash: viewDash, about: viewAbout, detail: viewDetail,
    login: viewLogin, signup: viewSignup, officialLogin: viewOfficialLogin,
    forgot: viewForgot, profile: viewProfile
  };
  const PROTECTED = new Set(["report","track","profile"]);
  function go(route, params){
    if (PROTECTED.has(route) && !state.session) {
      toast("Please sign in to continue");
      state.redirectAfter = { route, params };
      route = "login"; params = {};
    }
    state.route = route; state.params = params || {};
    $$("#nav button").forEach(b=>b.classList.toggle("active", b.dataset.route===route));
    $("#nav").classList.remove("open");
    closeProfileMenu();
    const v = $("#view");
    v.innerHTML = ""; v.classList.remove("fade");
    requestAnimationFrame(()=> { v.classList.add("fade"); (VIEWS[route] || viewHome)(); });
    window.scrollTo({top:0,behavior:"smooth"});
  }

  // ---------- VIEWS ----------
  function viewHome(){
    const total = state.reports.length;
    const resolved = state.reports.filter(r=>r.status==="Resolved").length;
    const inProg = state.reports.filter(r=>r.status==="In Progress").length;
    const stateCount = new Set(state.reports.map(r=>r.state)).size;
    const cats = CATEGORIES.map(c => `
      <div class="cat" data-cat="${c.id}">
        <div class="ic">${c.icon}</div>
        <div class="nm">${c.name}</div>
        <div class="dp">${c.dept}</div>
        <span class="pill" style="background:${PRIORITY_COLORS[c.priority]}">${c.priority}</span>
      </div>`).join("");

    $("#view").innerHTML = `
      <section class="hero">
        <div class="ribbons"></div>
        <h1>${t("tag")}</h1>
        <p>${t("sub")}</p>
        <div class="cta">
          <button class="btn accent" id="ctaReport">${t("start")} →</button>
          <button class="btn ghost" id="ctaLearn" style="color:#fff;border-color:rgba(255,255,255,.4)">${t("learn")}</button>
        </div>
        <div class="stats">
          <div class="stat"><b>${total.toLocaleString()}</b><span>Reports lodged</span></div>
          <div class="stat"><b>${resolved}</b><span>Resolved</span></div>
          <div class="stat"><b>${inProg}</b><span>In progress</span></div>
          <div class="stat"><b>${stateCount}/36</b><span>States &amp; UTs covered</span></div>
        </div>
        <div class="lang-strip">
          ${["en","hi","ta"].map(l=>`<button data-lang="${l}" class="${state.lang===l?'active':''}">${l==='en'?'English':l==='hi'?'हिन्दी':'தமிழ்'}</button>`).join("")}
        </div>
      </section>

      <div class="section-title"><h2>Pick an issue category</h2><span class="muted small">${CATEGORIES.length} departments mapped</span></div>
      <div class="grid cards-grid">${cats}</div>

      <div class="section-title" style="margin-top:32px"><h2>How JanSetu works</h2></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
        ${[
          ["📸","Capture","Snap a photo, record audio, or describe the issue."],
          ["📍","Locate","One-tap geolocation tags your exact spot on the map."],
          ["🏛️","Route","Auto-routed to the correct department for your state &amp; district."],
          ["🔔","Track","Get status updates from Submitted → Resolved with SLA timers."]
        ].map(s=>`<div class="card"><div style="font-size:30px">${s[0]}</div><h3>${s[1]}</h3><p class="muted small">${s[2]}</p></div>`).join("")}
      </div>
    `;
    $("#ctaReport").onclick = () => go("report");
    $("#ctaLearn").onclick = () => go("about");
    $$(".cat").forEach(el => el.onclick = () => go("report", { categoryId: el.dataset.cat }));
    $$(".lang-strip button").forEach(b => b.onclick = () => { state.lang = b.dataset.lang; save(); render(); });
  }

  function viewReport(){
    if (!state.session) {
      $("#view").innerHTML = `<div class="card empty"><div class="ico">🔒</div><h3>Sign in to file a report</h3>
        <p class="muted">We attach your name & state so officials can follow up.</p>
        <button class="btn primary" id="signInGo">Sign in</button>
        <button class="btn ghost" id="signUpGo" style="margin-left:8px">Create account</button></div>`;
      $("#signInGo").onclick = () => go("login");
      $("#signUpGo").onclick = () => go("signup");
      return;
    }
    state.draftMedia = [];
    const opts = CATEGORIES.map(c=>`<option value="${c.id}" ${state.params?.categoryId===c.id?'selected':''}>${c.icon} ${c.name}</option>`).join("");
    const stateOpts = STATES.map(s=>`<option ${state.session.state===s?'selected':''}>${s}</option>`).join("");
    $("#view").innerHTML = `
      <div class="section-title"><h2>📝 File a new civic report</h2></div>
      <div class="grid two-col">
        <div class="card">
          <form id="reportForm">
            <div class="form-grid">
              <label>Category
                <select name="categoryId" required>${opts}</select>
              </label>
              <label>Priority hint
                <input id="priorityHint" disabled value="auto">
              </label>
              <label style="grid-column:1/-1">Title
                <input name="title" required maxlength="100" placeholder="e.g., Pothole on MG Road near bus stand">
              </label>
              <label style="grid-column:1/-1">Description
                <textarea name="description" required maxlength="800" placeholder="Describe the issue, when it started, and how it affects citizens."></textarea>
              </label>
              <label>State
                <select name="state" id="rState" required>${stateOpts}</select>
              </label>
              <label>District
                <select name="district" id="rDistrict" required></select>
              </label>
              <label style="grid-column:1/-1">Address / landmark
                <input name="address" placeholder="Street, locality, landmark">
              </label>
              <label style="grid-column:1/-1">Location
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                  <button type="button" class="btn sm" id="geoBtn">📍 Use my location</button>
                  <span id="geoStatus" class="muted small">No location attached</span>
                </div>
              </label>
            </div>

            <h4 style="margin:18px 0 6px">Attach evidence</h4>
            <div class="media-row">
              <label class="media-tile">
                <div class="ico">📷</div>
                <div>Take / upload photo</div>
                <input type="file" accept="image/*" capture="environment" hidden id="photoIn" multiple>
              </label>
              <button type="button" class="media-tile" id="audioBtn">
                <div class="ico">🎙️</div>
                <div id="audioLbl">Record audio (max 30s)</div>
              </button>
              <label class="media-tile">
                <div class="ico">📎</div>
                <div>Other file</div>
                <input type="file" hidden id="fileIn">
              </label>
            </div>
            <div class="media-preview" id="mediaPrev"></div>

            <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
              <button class="btn primary">Submit Report</button>
              <button type="button" class="btn ghost" id="cancelBtn">Cancel</button>
            </div>
          </form>
        </div>
        <aside class="card">
          <h3>Smart routing</h3>
          <p class="muted small">Based on your category & state, this report will be auto-assigned to:</p>
          <div id="routePreview" style="padding:14px;border-radius:12px;background:var(--surface-2);margin-top:8px;font-size:14px"></div>
          <h3 style="margin-top:18px">SLA promise</h3>
          <div id="slaPreview" class="muted small">—</div>
          <h3 style="margin-top:18px">Tips</h3>
          <ul class="muted small" style="padding-left:18px;line-height:1.6">
            <li>Add a clear photo — speeds up resolution by 60%.</li>
            <li>Use “Use my location” for accurate routing.</li>
            <li>Keep descriptions factual & respectful.</li>
            <li>Track status from “My Reports”.</li>
          </ul>
        </aside>
      </div>
    `;
    fillDistricts($("#rState").value);
    $("#rState").onchange = e => fillDistricts(e.target.value);
    const updateRoute = () => {
      const c = cat($("[name=categoryId]").value);
      $("#priorityHint").value = c.priority;
      $("#routePreview").innerHTML = `<b>${c.dept}</b><br><span class="muted small">${$("[name=state]").value} · ${$("[name=district]").value}</span>`;
      $("#slaPreview").innerHTML = `Target resolution: <b>${c.sla} hrs</b> · Priority ${priorityBadge(c.priority)}`;
    };
    $$("[name=categoryId],[name=state],#rDistrict").forEach(el=>el.addEventListener("change",updateRoute));
    setTimeout(updateRoute,0);

    // Geolocation
    $("#geoBtn").onclick = () => {
      if (!navigator.geolocation) return toast("Geolocation not supported");
      $("#geoStatus").textContent = "Fetching location...";
      navigator.geolocation.getCurrentPosition(
        pos => {
          state.draftLat = pos.coords.latitude; state.draftLng = pos.coords.longitude;
          $("#geoStatus").innerHTML = `📍 ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (±${Math.round(pos.coords.accuracy)}m)`;
        },
        err => $("#geoStatus").textContent = "Permission denied or unavailable.",
        { enableHighAccuracy:true, timeout:10000 }
      );
    };

    // Photo
    $("#photoIn").onchange = async e => {
      for (const f of e.target.files) {
        const dataUrl = await fileToDataURL(f, 1200);
        state.draftMedia.push({ type:"image", data:dataUrl, name:f.name });
      }
      renderMedia();
    };
    $("#fileIn").onchange = async e => {
      const f = e.target.files[0]; if(!f) return;
      const dataUrl = await fileToDataURL(f);
      state.draftMedia.push({ type:"file", data:dataUrl, name:f.name });
      renderMedia();
    };

    // Audio
    let mediaRec=null, chunks=[], stream=null;
    $("#audioBtn").onclick = async () => {
      if (mediaRec && mediaRec.state==="recording") { mediaRec.stop(); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({audio:true});
        mediaRec = new MediaRecorder(stream);
        chunks = [];
        mediaRec.ondataavailable = e => chunks.push(e.data);
        mediaRec.onstop = async () => {
          stream.getTracks().forEach(t=>t.stop());
          const blob = new Blob(chunks, { type:"audio/webm" });
          const data = await blobToDataURL(blob);
          state.draftMedia.push({ type:"audio", data, name:"voicenote.webm" });
          $("#audioLbl").textContent = "Record audio (max 30s)";
          renderMedia();
        };
        mediaRec.start();
        $("#audioLbl").innerHTML = `<span class="rec-pulse"></span> Recording... tap to stop`;
        setTimeout(()=>{ if (mediaRec.state==="recording") mediaRec.stop(); }, 30000);
      } catch (e) { toast("Mic permission denied"); }
    };

    function renderMedia(){
      $("#mediaPrev").innerHTML = state.draftMedia.map((m,i) => {
        const inner = m.type==="image" ? `<img src="${m.data}">` :
                      m.type==="audio" ? `🎙️<br>${m.name}` :
                      `📎<br>${escapeHtml(m.name).slice(0,12)}`;
        return `<div class="chip">${inner}<button class="x" data-i="${i}">✕</button></div>`;
      }).join("");
      $$("#mediaPrev .x").forEach(b => b.onclick = () => { state.draftMedia.splice(+b.dataset.i,1); renderMedia(); });
    }

    $("#cancelBtn").onclick = () => go("home");
    $("#reportForm").onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const r = mkReport({
        categoryId: fd.get("categoryId"),
        title: fd.get("title"), description: fd.get("description"),
        state: fd.get("state"), district: fd.get("district"), address: fd.get("address"),
        lat: state.draftLat||null, lng: state.draftLng||null,
        photos: state.draftMedia.filter(m=>m.type==="image").map(m=>m.data),
        audio: (state.draftMedia.find(m=>m.type==="audio")||{}).data || null,
        userId: state.session.id, userName: state.session.name
      });
      state.reports.unshift(r); save();
      toast(`Report ${r.id} filed → routed to ${r.department}`);
      go("detail", { id:r.id });
    };
  }

  function fileToDataURL(file, maxW){
    return new Promise((res,rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        if (!maxW || !file.type.startsWith("image/")) return res(fr.result);
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxW / img.width);
          const c = document.createElement("canvas");
          c.width = img.width * scale; c.height = img.height * scale;
          c.getContext("2d").drawImage(img,0,0,c.width,c.height);
          res(c.toDataURL("image/jpeg",0.78));
        };
        img.src = fr.result;
      };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }
  function blobToDataURL(blob){ return new Promise(r=>{ const f=new FileReader(); f.onload=()=>r(f.result); f.readAsDataURL(blob);});}

  function fillDistricts(st){
    const sel = $("#rDistrict"); if(!sel) return;
    const ds = DISTRICTS[st] || ["(other)"];
    sel.innerHTML = ds.map(d=>`<option>${d}</option>`).join("");
  }

  function viewTrack(){
    if (!state.session) { go("report"); return; }
    const mine = state.reports.filter(r => r.userId === state.session.id);
    $("#view").innerHTML = `
      <div class="section-title"><h2>📋 My Reports</h2><span class="muted small">${mine.length} total</span></div>
      ${mine.length ? `<div class="grid" style="grid-template-columns:1fr">${mine.map(reportCard).join("")}</div>`
      : `<div class="card empty"><div class="ico">📭</div><h3>No reports yet</h3>
         <p class="muted">File your first issue to start tracking it.</p>
         <button class="btn primary" onclick="document.querySelector('[data-route=report]').click()">File a report</button></div>`}
    `;
    bindReportCards();
  }

  function viewFeed(){
    const cats = ["all", ...CATEGORIES.map(c=>c.id)];
    const fState = state.feedFilter?.state || "all";
    const fCat   = state.feedFilter?.cat || "all";
    const fStatus= state.feedFilter?.status || "all";
    const filtered = state.reports.filter(r =>
      (fState==="all"||r.state===fState) &&
      (fCat==="all"||r.categoryId===fCat) &&
      (fStatus==="all"||r.status===fStatus)
    ).sort((a,b)=> (state.upvotes[b.id]||0) - (state.upvotes[a.id]||0));
    $("#view").innerHTML = `
      <div class="section-title"><h2>📡 Live Community Feed</h2><span class="muted small">${filtered.length} reports</span></div>
      <div class="filterbar">
        <select id="fState"><option value="all">All states</option>${STATES.map(s=>`<option ${s===fState?'selected':''}>${s}</option>`).join("")}</select>
        <select id="fCat"><option value="all">All categories</option>${CATEGORIES.map(c=>`<option value="${c.id}" ${c.id===fCat?'selected':''}>${c.icon} ${c.name}</option>`).join("")}</select>
        <select id="fStatus"><option value="all">All statuses</option>${STATUSES.map(s=>`<option ${s===fStatus?'selected':''}>${s}</option>`).join("")}</select>
      </div>
      <div class="grid" style="grid-template-columns:1fr">${filtered.map(reportCard).join("") || '<div class="empty">No matching reports.</div>'}</div>
    `;
    ["fState","fCat","fStatus"].forEach(id => $("#"+id).onchange = e => {
      state.feedFilter = state.feedFilter||{};
      state.feedFilter[id.slice(1).toLowerCase()] = e.target.value;
      // map ids properly
      state.feedFilter = { state:$("#fState").value, cat:$("#fCat").value, status:$("#fStatus").value };
      viewFeed();
    });
    bindReportCards();
  }

  function reportCard(r){
    const c = cat(r.categoryId);
    const upv = state.upvotes[r.id] || 0;
    const thumb = r.photos[0] ? `<img src="${r.photos[0]}">` : c.icon;
    return `<div class="report-card" data-id="${r.id}">
      <div class="thumb">${thumb}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          ${priorityBadge(r.priority)} ${statusBadge(r.status)}
          <span class="muted small">#${r.id}</span>
        </div>
        <h4 style="margin-top:6px">${escapeHtml(r.title)}</h4>
        <div class="muted small">${escapeHtml(r.description).slice(0,140)}${r.description.length>140?'…':''}</div>
        <div class="meta">
          <span>${c.icon} ${c.name}</span>
          <span>📍 ${escapeHtml(r.district)}, ${escapeHtml(r.state)}</span>
          <span>🏛️ ${escapeHtml(r.department)}</span>
          <span>🕒 ${fmtTime(r.createdAt)}</span>
          <span>👍 <button class="btn sm upvote" data-id="${r.id}">${upv}</button></span>
          <button class="btn sm view" data-id="${r.id}">View</button>
        </div>
      </div>
    </div>`;
  }
  function bindReportCards(){
    $$(".upvote").forEach(b => b.onclick = e => {
      e.stopPropagation();
      state.upvotes[b.dataset.id] = (state.upvotes[b.dataset.id]||0) + 1;
      save(); b.textContent = state.upvotes[b.dataset.id];
    });
    $$(".view").forEach(b => b.onclick = () => go("detail", { id: b.dataset.id }));
    $$(".report-card").forEach(c => c.onclick = e => {
      if (e.target.closest("button")) return;
      go("detail", { id: c.dataset.id });
    });
  }

  function viewDetail(){
    const r = state.reports.find(x=>x.id===state.params.id);
    if (!r) return go("feed");
    const c = cat(r.categoryId);
    const stepIdx = STATUSES.indexOf(r.status);
    const tl = STATUSES.slice(0,4).map((s,i)=>`<div class="tl-step ${i<=stepIdx?'done':''}">${s}</div>`).join("");
    const photos = r.photos.map(p=>`<img src="${p}" style="width:140px;height:140px;object-fit:cover;border-radius:10px;border:1px solid var(--border)">`).join("");
    const updates = r.updates.slice().reverse().map(u =>
      `<div style="padding:10px;border-left:3px solid var(--primary);background:var(--surface-2);border-radius:8px;margin-bottom:8px">
        ${statusBadge(u.status)} <span class="muted small">${new Date(u.at).toLocaleString()}</span>
        <div style="margin-top:4px">${escapeHtml(u.note)}</div>
      </div>`).join("");
    $("#view").innerHTML = `
      <div class="section-title"><h2>${c.icon} ${escapeHtml(r.title)}</h2>
        <button class="btn sm" onclick="history.back()">← Back</button>
      </div>
      <div class="grid two-col">
        <div class="card">
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
            ${priorityBadge(r.priority)} ${statusBadge(r.status)}
            <span class="badge st-Submitted">#${r.id}</span>
          </div>
          <p>${escapeHtml(r.description)}</p>
          ${photos ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${photos}</div>` : ""}
          ${r.audio ? `<audio controls src="${r.audio}" style="margin-top:10px;width:100%"></audio>` : ""}
          <div class="tl">${tl}</div>
          <h4 style="margin-top:18px">Updates</h4>
          ${updates}
        </div>
        <aside class="card">
          <h3>Routing</h3>
          <div><b>Department:</b> ${r.department}</div>
          <div><b>State:</b> ${r.state}</div>
          <div><b>District:</b> ${r.district}</div>
          <div><b>Address:</b> ${escapeHtml(r.address) || "—"}</div>
          ${r.lat ? `<div><b>Geo:</b> ${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}
            <a target="_blank" href="https://www.google.com/maps?q=${r.lat},${r.lng}">Open map ↗</a></div>` : ""}
          <div><b>Reported by:</b> ${escapeHtml(r.userName)} · ${fmtTime(r.createdAt)}</div>
          <div><b>SLA target:</b> ${r.sla} hrs</div>
          <div style="margin-top:10px">
            <button class="btn sm" id="shareBtn">🔗 Share</button>
            <button class="btn sm" id="upBtn">👍 Upvote (${state.upvotes[r.id]||0})</button>
          </div>
        </aside>
      </div>
    `;
    $("#shareBtn").onclick = async () => {
      const url = location.origin + location.pathname + "#" + r.id;
      try { await navigator.clipboard.writeText(url); toast("Link copied"); } catch { toast(url); }
    };
    $("#upBtn").onclick = () => {
      state.upvotes[r.id] = (state.upvotes[r.id]||0) + 1; save();
      $("#upBtn").textContent = `👍 Upvote (${state.upvotes[r.id]})`;
    };
  }

  function viewDash(){
    if (!state.official) {
      $("#view").innerHTML = `<div class="card empty"><div class="ico">🏛️</div><h3>Officials Dashboard</h3>
        <p class="muted">Authorized department officers can review and update report status.</p>
        <button class="btn primary" id="offGo">Department login</button></div>`;
      $("#offGo").onclick = () => go("officialLogin");
      return;
    }
    const o = state.official;
    const scope = state.reports.filter(r => r.department===o.dept && (o.state==="All India" || r.state===o.state));
    const byStatus = STATUSES.map(s => [s, scope.filter(r=>r.status===s).length]);
    const total = scope.length;
    const resolved = scope.filter(r=>r.status==="Resolved").length;
    const avgAge = scope.length ? Math.round(scope.reduce((a,r)=>a+(Date.now()-r.createdAt),0)/scope.length/3600000) : 0;
    const byCat = {};
    scope.forEach(r => byCat[r.categoryId] = (byCat[r.categoryId]||0)+1);
    const max = Math.max(1, ...Object.values(byCat));
    const bars = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([k,v]) => {
      const c = cat(k); return `<div class="bar-row"><span>${c.icon} ${c.name}</span><div class="bar"><i style="width:${(v/max)*100}%"></i></div><span>${v}</span></div>`;
    }).join("") || '<div class="muted">No data.</div>';

    $("#view").innerHTML = `
      <div class="section-title">
        <h2>🏛️ ${o.dept} · ${o.state}</h2>
        <button class="btn sm" id="offOut">Sign out officer</button>
      </div>
      <div class="grid kpi-grid">
        <div class="card kpi"><div class="l">Total reports</div><div class="v">${total}</div></div>
        <div class="card kpi"><div class="l">Resolved</div><div class="v">${resolved}</div><div class="delta">${total?Math.round(resolved/total*100):0}% resolution rate</div></div>
        <div class="card kpi"><div class="l">Avg. age (hrs)</div><div class="v">${avgAge}</div></div>
        <div class="card kpi"><div class="l">Pending action</div><div class="v">${scope.filter(r=>r.status==="Submitted"||r.status==="Acknowledged").length}</div></div>
      </div>
      <div class="grid two-col" style="margin-top:18px">
        <div class="card">
          <h3>Status pipeline</h3>
          ${byStatus.map(([s,n]) => `<div class="bar-row"><span>${statusBadge(s)}</span><div class="bar"><i style="width:${total?(n/total)*100:0}%"></i></div><span>${n}</span></div>`).join("")}
          <h3 style="margin-top:18px">Issue heatmap</h3>
          <div class="heat">${Array.from({length:200},() => `<i style="background:rgba(11,61,46,${Math.random()*0.7+0.05})"></i>`).join("")}</div>
        </div>
        <div class="card">
          <h3>Top categories</h3>
          <div class="bars">${bars}</div>
        </div>
      </div>
      <div class="section-title" style="margin-top:24px"><h2>Action queue</h2></div>
      <div class="grid" style="grid-template-columns:1fr">
        ${scope.length ? scope.map(officialCard).join("") : '<div class="empty">No reports in your scope yet.</div>'}
      </div>
    `;
    $("#offOut").onclick = () => { state.official=null; save(); toast("Officer signed out"); render(); };
    $$(".st-update").forEach(sel => sel.onchange = e => {
      const r = state.reports.find(x=>x.id===sel.dataset.id);
      r.status = e.target.value;
      r.updates.push({ at:Date.now(), status:r.status, note:`Updated by ${state.official.id} (${state.official.dept})` });
      save(); toast(`#${r.id} → ${r.status}`); viewDash();
    });
    $$(".off-view").forEach(b => b.onclick = () => go("detail", { id:b.dataset.id }));
  }

  function officialCard(r){
    const c = cat(r.categoryId);
    return `<div class="report-card">
      <div class="thumb">${r.photos[0]?`<img src="${r.photos[0]}">`:c.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          ${priorityBadge(r.priority)} <b>${escapeHtml(r.title)}</b>
          <span class="muted small">#${r.id} · ${fmtTime(r.createdAt)}</span>
        </div>
        <div class="muted small">${escapeHtml(r.district)}, ${escapeHtml(r.state)} · by ${escapeHtml(r.userName)}</div>
        <div class="meta">
          <select class="st-update" data-id="${r.id}">
            ${STATUSES.map(s=>`<option ${s===r.status?'selected':''}>${s}</option>`).join("")}
          </select>
          <button class="btn sm off-view" data-id="${r.id}">Open</button>
        </div>
      </div>
    </div>`;
  }

  function viewAbout(){
    $("#view").innerHTML = `
      <div class="section-title"><h2>About JanSetu</h2></div>
      <div class="card">
        <p>JanSetu (जनसेतु — “People's Bridge”) is an SIH-aligned civic engagement prototype that lets every Indian
        citizen log everyday municipal issues — potholes, garbage, water supply, streetlights, drainage, traffic,
        public safety and more — and route them automatically to the responsible department in their state and district.</p>
        <h3>Why it matters</h3>
        <ul>
          <li>📱 Mobile-first reporting with photo, audio &amp; geolocation evidence.</li>
          <li>🏛️ ${CATEGORIES.length} issue categories mapped to real Indian departments (PWD, Jal Board, DISCOM, SDMA, Lokayukta, etc.).</li>
          <li>🇮🇳 Coverage for all <b>28 states + 8 union territories</b>.</li>
          <li>📊 SLA-based prioritisation (Critical: 1–6 hrs · High: 24–72 hrs · Low: up to 10 days).</li>
          <li>🗳️ Community upvoting surfaces the most-impactful issues to officials.</li>
          <li>🔐 Local-first: data lives on your device; no backend required.</li>
          <li>🌐 Multilingual UI (English / हिन्दी / தமிழ்).</li>
        </ul>
        <h3>Tech (vanilla web only)</h3>
        <p class="muted">HTML5 · CSS variables &amp; grid · Vanilla JS state machine · MediaRecorder API · Geolocation API · FileReader · Canvas image compression · localStorage persistence.</p>
        <h3>Demo accounts</h3>
        <p class="muted small">Citizen: create any account. Official: any officer ID + access code <code>jansetu</code>.</p>
      </div>
    `;
  }

  // ---------- AUTH (dedicated pages) ----------
  const ALL_DEPTS = [...new Set(CATEGORIES.map(c=>c.dept))];

  // Captcha
  function newCaptcha(){
    const a = Math.floor(Math.random()*9)+1, b = Math.floor(Math.random()*9)+1;
    state._cap = { q:`${a} + ${b}`, ans: a+b };
    return state._cap;
  }
  // Password strength scoring
  function pwStrength(p){
    let s = 0;
    if (p.length>=6) s++;
    if (p.length>=10) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(4,s);
  }
  const STRENGTH_LBL = ["Too weak","Weak","Fair","Good","Strong"];

  function authShell(active, formHtml, hero){
    return `<section class="auth-page">
      <aside class="auth-hero">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:30px">
            <div style="width:42px;height:42px;border-radius:12px;background:rgba(255,255,255,.18);display:grid;place-items:center;font-size:22px">⚖</div>
            <div><b style="font-size:18px">JanSetu</b><div style="font-size:12px;opacity:.8">जनसेतु</div></div>
          </div>
          <h1>${hero.title}</h1>
          <p>${hero.sub}</p>
          <ul class="ah-bullets">
            ${hero.bullets.map(b=>`<li><span class="ic">${b[0]}</span><span><b>${b[1]}</b><br><span style="opacity:.85">${b[2]}</span></span></li>`).join("")}
          </ul>
        </div>
        <div class="ah-foot">
          <span>🔒 Local-first</span><span>🇮🇳 36 States/UTs</span><span>🏛️ ${CATEGORIES.length} departments</span>
        </div>
      </aside>
      <div class="auth-form-side">
        <div class="auth-tabs">
          <a data-go="login"   class="${active==='login'?'active':''}">Sign in</a>
          <a data-go="signup"  class="${active==='signup'?'active':''}">Create account</a>
          <a data-go="officialLogin" class="${active==='official'?'active':''}">Official</a>
        </div>
        ${formHtml}
      </div>
    </section>`;
  }
  function bindTabs(){
    $$(".auth-tabs a").forEach(a => a.onclick = () => go(a.dataset.go));
  }
  function bindPwToggle(){
    $$(".pw-wrap .toggle").forEach(b => b.onclick = () => {
      const inp = b.previousElementSibling;
      inp.type = inp.type==="password" ? "text" : "password";
      b.textContent = inp.type==="password" ? "👁" : "🙈";
    });
  }

  function viewLogin(){
    const cap = newCaptcha();
    $("#view").innerHTML = authShell("login", `
      <h2>Welcome back 👋</h2>
      <p class="sub">Sign in to file reports, track resolutions and join your community feed.</p>
      <form id="loginForm" novalidate>
        <label>Email or phone
          <input name="id" autocomplete="username" placeholder="you@example.com or 10-digit phone" required>
          <div class="field-err" data-err="id">Enter email or 10-digit phone</div>
        </label>
        <label>Password
          <div class="pw-wrap">
            <input type="password" name="pw" autocomplete="current-password" placeholder="Your password" required>
            <button type="button" class="toggle" tabindex="-1">👁</button>
          </div>
          <div class="field-err" data-err="pw">Password is required</div>
        </label>
        <div class="cap-box">
          <span>Verify:</span><span class="q" id="capQ">${cap.q}</span>
          <input name="cap" placeholder="=?" inputmode="numeric" required>
          <button type="button" class="reload" id="capR" title="New question">🔄</button>
        </div>
        <div class="checkbox-row">
          <label><input type="checkbox" name="remember" checked> Remember me</label>
          <a id="forgotLink">Forgot password?</a>
        </div>
        <button class="btn primary block" type="submit">Sign in →</button>
        <div class="divider">or continue with</div>
        <div class="social-row">
          <button type="button" class="social-btn" data-soc="google">🇬 Google</button>
          <button type="button" class="social-btn" data-soc="phone">📱 OTP</button>
        </div>
        <div class="auth-foot">New to JanSetu? <a data-go="signup">Create an account</a></div>
      </form>
    `, {
      title:"Your voice. Your city.",
      sub:"India's open civic reporting network — backed by 25 mapped departments.",
      bullets:[
        ["📸","Capture evidence","Photo, audio & geo-tagged proof in one tap."],
        ["🏛️","Auto-routed","Issues land in the right municipal department instantly."],
        ["📊","Track resolutions","SLA timers from Submitted → Resolved."]
      ]
    });
    bindTabs(); bindPwToggle();
    $("#capR").onclick = () => { const c = newCaptcha(); $("#capQ").textContent = c.q; };
    $("#forgotLink").onclick = () => go("forgot");
    $$(".social-btn").forEach(b => b.onclick = () => toast("Demo only — local accounts use email/phone."));
    $("#loginForm").onsubmit = e => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      let ok = true;
      const setErr = (n,show) => { const i = e.target[n]; const er = e.target.querySelector(`[data-err=${n}]`); i.classList.toggle("error",show); er?.classList.toggle("show",show); if(show) ok=false; };
      setErr("id", !fd.id || (!/^\S+@\S+\.\S+$/.test(fd.id) && !/^\d{10}$/.test(fd.id)));
      setErr("pw", !fd.pw);
      if (Number(fd.cap) !== state._cap.ans) { toast("Captcha incorrect"); const c=newCaptcha(); $("#capQ").textContent=c.q; e.target.cap.value=""; return; }
      if (!ok) return;
      const u = state.users.find(u => (u.email===fd.id || u.phone===fd.id) && u.pw===hash(fd.pw));
      if (!u) return toast("❌ Invalid credentials. Try again or sign up.");
      state.session = u; save();
      toast(`✅ Welcome back, ${u.name.split(" ")[0]}!`);
      const r = state.redirectAfter; state.redirectAfter = null;
      render(); if (r) go(r.route, r.params); else go("home");
    };
  }

  function viewSignup(){
    $("#view").innerHTML = authShell("signup", `
      <h2>Create your account</h2>
      <p class="sub">Free forever. Your data stays on your device.</p>
      <form id="signupForm" novalidate>
        <label>Full name
          <input name="name" placeholder="e.g., Anika Sharma" required>
          <div class="field-err" data-err="name">Please enter your name (min 2 chars)</div>
        </label>
        <div class="row-2">
          <label>Email
            <input type="email" name="email" placeholder="you@example.com" required>
            <div class="field-err" data-err="email">Valid email required</div>
          </label>
          <label>Phone (10-digit)
            <input name="phone" inputmode="numeric" maxlength="10" placeholder="9876543210" required>
            <div class="field-err" data-err="phone">10-digit phone required</div>
          </label>
        </div>
        <label>State <select name="state" id="suState" required></select></label>
        <label>Password
          <div class="pw-wrap">
            <input type="password" name="pw" placeholder="At least 6 characters" required>
            <button type="button" class="toggle" tabindex="-1">👁</button>
          </div>
          <div class="strength" id="pwStr"><i></i></div>
          <div class="strength-lbl" id="pwLbl">Enter a password</div>
        </label>
        <label>Confirm password
          <div class="pw-wrap">
            <input type="password" name="pw2" placeholder="Re-enter password" required>
            <button type="button" class="toggle" tabindex="-1">👁</button>
          </div>
          <div class="field-err" data-err="pw2">Passwords don't match</div>
        </label>
        <div class="checkbox-row">
          <label><input type="checkbox" name="agree" required> I agree to the <a>terms</a> & <a>privacy policy</a></label>
        </div>
        <button class="btn primary block" type="submit">Create account →</button>
        <div class="auth-foot">Already a member? <a data-go="login">Sign in</a></div>
      </form>
    `, {
      title:"Join 1,00,000+ citizens",
      sub:"Make your neighbourhood heard. Track every report end-to-end.",
      bullets:[
        ["🚀","30-second signup","No OTP wait, no document upload."],
        ["🔐","Privacy-first","Stored locally — you own your data."],
        ["🏆","Earn impact","Upvotes, badges, leaderboards for civic heroes."]
      ]
    });
    bindTabs(); bindPwToggle();
    $("#suState").innerHTML = STATES.map(s=>`<option>${s}</option>`).join("");
    const pwIn = $("[name=pw]");
    pwIn.addEventListener("input", () => {
      const s = pwStrength(pwIn.value);
      const el = $("#pwStr"); el.className = "strength s"+s;
      $("#pwLbl").textContent = pwIn.value ? STRENGTH_LBL[s] + (s<2 ? " — add capitals, numbers or symbols" : "") : "Enter a password";
    });
    // Live phone digit-only
    $("[name=phone]").addEventListener("input", e => e.target.value = e.target.value.replace(/\D/g,"").slice(0,10));
    $("#signupForm").onsubmit = e => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      let ok = true;
      const setErr = (n,show) => { const i = e.target[n]; const er = e.target.querySelector(`[data-err=${n}]`); i.classList.toggle("error",show); er?.classList.toggle("show",show); if(show) ok=false; };
      setErr("name", !fd.name || fd.name.trim().length<2);
      setErr("email", !/^\S+@\S+\.\S+$/.test(fd.email||""));
      setErr("phone", !/^\d{10}$/.test(fd.phone||""));
      setErr("pw2", fd.pw !== fd.pw2);
      if (pwStrength(fd.pw) < 1) { toast("Password too weak"); return; }
      if (!fd.agree) { toast("Please accept the terms"); return; }
      if (!ok) return;
      if (state.users.find(u => u.email===fd.email)) return toast("Email already registered. Try signing in.");
      if (state.users.find(u => u.phone===fd.phone)) return toast("Phone already registered.");
      const u = { id:"u_"+Date.now().toString(36), name:fd.name.trim(), email:fd.email.toLowerCase(), phone:fd.phone, state:fd.state, pw:hash(fd.pw), joined:Date.now(), badges:["🌱 Newcomer"] };
      state.users.push(u); state.session = u; save();
      toast(`🎉 Account created. Welcome, ${u.name.split(" ")[0]}!`);
      const r = state.redirectAfter; state.redirectAfter = null;
      render(); if (r) go(r.route, r.params); else go("home");
    };
  }

  function viewOfficialLogin(){
    $("#view").innerHTML = authShell("official", `
      <h2>🏛️ Department Officer</h2>
      <p class="sub">Authorized municipal officials only. Manage and resolve reports in your scope.</p>
      <form id="offForm" novalidate>
        <label>Officer ID
          <input name="id" required value="OFFICER-${Math.floor(Math.random()*900+100)}" autocomplete="username">
        </label>
        <label>Department
          <select name="dept" id="oDept" required></select>
        </label>
        <label>State / UT
          <select name="state" id="oState" required></select>
        </label>
        <label>Access code
          <div class="pw-wrap">
            <input type="password" name="code" required placeholder="Enter access code">
            <button type="button" class="toggle" tabindex="-1">👁</button>
          </div>
          <div class="field-err" data-err="code">Invalid access code</div>
        </label>
        <button class="btn primary block" type="submit">Enter dashboard →</button>
        <p class="muted small" style="text-align:center;margin-top:14px">Demo access code: <code>jansetu</code></p>
        <div class="auth-foot">Citizen? <a data-go="login">Sign in here</a></div>
      </form>
    `, {
      title:"Departmental command centre",
      sub:"KPIs, heatmaps, action queues — across your jurisdiction.",
      bullets:[
        ["📊","Real-time KPIs","Resolution rate, average age, pending action."],
        ["🗺️","Heatmaps","Spot hotspots across districts at a glance."],
        ["⚡","One-click triage","Acknowledge → Progress → Resolve in seconds."]
      ]
    });
    bindTabs(); bindPwToggle();
    $("#oDept").innerHTML = ALL_DEPTS.map(d=>`<option>${d}</option>`).join("");
    $("#oState").innerHTML = `<option>All India</option>` + STATES.map(s=>`<option>${s}</option>`).join("");
    $("#offForm").onsubmit = e => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      if (fd.code !== "jansetu") {
        const er = e.target.querySelector('[data-err=code]'); er.classList.add("show"); e.target.code.classList.add("error");
        return toast("❌ Invalid access code");
      }
      state.official = { id:fd.id, dept:fd.dept, state:fd.state, since:Date.now() };
      save(); toast(`🏛️ Officer mode: ${fd.dept}`); render(); go("dash");
    };
  }

  function viewForgot(){
    const step = state._fpStep || 1;
    if (step === 1) {
      $("#view").innerHTML = authShell("login", `
        <h2>Reset password</h2>
        <p class="sub">Enter your registered email — we'll send a 6-digit OTP (demo shown on screen).</p>
        <form id="fpForm">
          <label>Email <input type="email" name="email" required placeholder="you@example.com"></label>
          <button class="btn primary block" type="submit">Send OTP →</button>
          <div class="auth-foot"><a data-go="login">← Back to sign in</a></div>
        </form>
      `, { title:"Forgot it? No worries.", sub:"Recover access in under a minute.", bullets:[
        ["📧","Email OTP","Demo OTP shown on this screen."],
        ["🔐","Strong reset","Choose a fresh strong password."],
        ["✅","Auto sign-in","Instantly logged in after reset."]
      ]});
      bindTabs();
      $("#fpForm").onsubmit = e => {
        e.preventDefault();
        const email = e.target.email.value.toLowerCase();
        const u = state.users.find(u=>u.email===email);
        if (!u) return toast("No account found with that email");
        state._fpUser = u.id;
        state._fpOtp = String(Math.floor(100000+Math.random()*900000));
        state._fpStep = 2; viewForgot();
      };
    } else if (step === 2) {
      $("#view").innerHTML = authShell("login", `
        <h2>Enter OTP</h2>
        <p class="sub">A 6-digit code was sent. (Demo OTP: <code>${state._fpOtp}</code>)</p>
        <form id="otpForm">
          <div class="otp-row">
            ${[0,1,2,3,4,5].map(i=>`<input data-i="${i}" maxlength="1" inputmode="numeric" required>`).join("")}
          </div>
          <button class="btn primary block" type="submit">Verify →</button>
          <div class="auth-foot"><a id="resend">Resend code</a></div>
        </form>
      `, { title:"Check your inbox", sub:"OTPs expire in 5 minutes for security.", bullets:[
        ["⏱️","Quick verify","Auto-jumps between digits."],
        ["🔄","Resend anytime","If you didn't receive it."],
        ["🛡️","Brute-force safe","Limited attempts per session."]
      ]});
      bindTabs();
      const inputs = $$(".otp-row input");
      inputs.forEach((inp,i) => {
        inp.addEventListener("input", () => {
          inp.value = inp.value.replace(/\D/g,"");
          if (inp.value && i<5) inputs[i+1].focus();
        });
        inp.addEventListener("keydown", e => { if (e.key==="Backspace" && !inp.value && i>0) inputs[i-1].focus(); });
      });
      $("#resend").onclick = () => { state._fpOtp = String(Math.floor(100000+Math.random()*900000)); toast("New OTP: "+state._fpOtp); viewForgot(); };
      $("#otpForm").onsubmit = e => {
        e.preventDefault();
        const v = inputs.map(i=>i.value).join("");
        if (v !== state._fpOtp) return toast("❌ OTP incorrect");
        state._fpStep = 3; viewForgot();
      };
    } else {
      $("#view").innerHTML = authShell("login", `
        <h2>Set a new password</h2>
        <p class="sub">Make it strong — you'll be signed in automatically.</p>
        <form id="rpForm">
          <label>New password
            <div class="pw-wrap"><input type="password" name="pw" required minlength="6"><button type="button" class="toggle" tabindex="-1">👁</button></div>
            <div class="strength" id="rps"><i></i></div>
          </label>
          <label>Confirm
            <div class="pw-wrap"><input type="password" name="pw2" required><button type="button" class="toggle" tabindex="-1">👁</button></div>
          </label>
          <button class="btn primary block" type="submit">Reset & sign in →</button>
        </form>
      `, { title:"Almost there!", sub:"One last step to recover your account.", bullets:[
        ["💪","Strong by default","Live strength meter."],
        ["✨","Auto sign-in","No need to log in again."],
        ["🔁","Synced everywhere","Across all your sessions on this device."]
      ]});
      bindTabs(); bindPwToggle();
      const pwIn = $("[name=pw]");
      pwIn.addEventListener("input", () => $("#rps").className = "strength s"+pwStrength(pwIn.value));
      $("#rpForm").onsubmit = e => {
        e.preventDefault();
        const fd = Object.fromEntries(new FormData(e.target));
        if (fd.pw !== fd.pw2) return toast("Passwords don't match");
        if (pwStrength(fd.pw) < 1) return toast("Password too weak");
        const u = state.users.find(u=>u.id===state._fpUser);
        u.pw = hash(fd.pw); state.session = u; state._fpStep = null;
        save(); toast("✅ Password reset successful"); render(); go("home");
      };
    }
  }

  function viewProfile(){
    const u = state.session;
    const mine = state.reports.filter(r=>r.userId===u.id);
    const resolved = mine.filter(r=>r.status==="Resolved").length;
    $("#view").innerHTML = `
      <div class="section-title"><h2>👤 My Profile</h2><button class="btn sm" id="logoutP">Sign out</button></div>
      <div class="grid two-col">
        <div class="card">
          <div style="display:flex;gap:18px;align-items:center;margin-bottom:18px">
            <div class="avatar" style="width:72px;height:72px;font-size:28px">${u.name[0].toUpperCase()}</div>
            <div>
              <h3 style="margin:0">${escapeHtml(u.name)}</h3>
              <div class="muted small">${escapeHtml(u.email)} · ${escapeHtml(u.phone)}</div>
              <div class="muted small">📍 ${escapeHtml(u.state)} · Joined ${new Date(u.joined||Date.now()).toLocaleDateString()}</div>
            </div>
          </div>
          <h4>Edit details</h4>
          <form id="profForm" class="form-grid">
            <label>Name <input name="name" value="${escapeHtml(u.name)}" required></label>
            <label>State <select name="state" id="pState"></select></label>
            <label>Email <input type="email" name="email" value="${escapeHtml(u.email)}" required></label>
            <label>Phone <input name="phone" value="${escapeHtml(u.phone)}" maxlength="10" required></label>
            <label style="grid-column:1/-1"><button class="btn primary">Save changes</button></label>
          </form>
          <h4 style="margin-top:18px">Change password</h4>
          <form id="cpForm" class="form-grid">
            <label>Current <input type="password" name="cur" required></label>
            <label>New <input type="password" name="np" minlength="6" required></label>
            <label style="grid-column:1/-1"><button class="btn">Update password</button></label>
          </form>
        </div>
        <aside class="card">
          <h3>Your impact</h3>
          <div class="grid kpi-grid" style="grid-template-columns:1fr 1fr">
            <div class="card kpi"><div class="l">Reports filed</div><div class="v">${mine.length}</div></div>
            <div class="card kpi"><div class="l">Resolved</div><div class="v">${resolved}</div></div>
          </div>
          <h4 style="margin-top:14px">Badges</h4>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${(u.badges||["🌱 Newcomer"]).concat(mine.length>=5?["⭐ Active Citizen"]:[]).concat(resolved>=1?["✅ Impact Maker"]:[]).map(b=>`<span class="badge">${b}</span>`).join("")}
          </div>
          <h4 style="margin-top:14px">Danger zone</h4>
          <button class="btn" id="delAcc" style="color:var(--danger);border-color:var(--danger)">Delete my account</button>
        </aside>
      </div>`;
    $("#pState").innerHTML = STATES.map(s=>`<option ${s===u.state?'selected':''}>${s}</option>`).join("");
    $("#logoutP").onclick = signOut;
    $("#profForm").onsubmit = e => {
      e.preventDefault();
      Object.assign(u, Object.fromEntries(new FormData(e.target)));
      const idx = state.users.findIndex(x=>x.id===u.id); state.users[idx]=u; state.session=u;
      save(); toast("Profile updated"); render();
    };
    $("#cpForm").onsubmit = e => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      if (hash(fd.cur)!==u.pw) return toast("Current password incorrect");
      u.pw = hash(fd.np); save(); toast("Password updated"); e.target.reset();
    };
    $("#delAcc").onclick = () => {
      if (!confirm("Permanently delete your account? Your reports will remain anonymously.")) return;
      state.users = state.users.filter(x=>x.id!==u.id); state.session=null; save(); render(); go("home"); toast("Account deleted");
    };
  }

  function signOut(){
    state.session = null; save(); toast("👋 Signed out"); render(); go("home");
  }

  // tiny non-cryptographic hash so we don't store plaintext (demo only)
  function hash(s){ let h=5381; for (let i=0;i<s.length;i++) h=((h<<5)+h)+s.charCodeAt(i); return "h"+(h>>>0).toString(36); }

  // Migrate old plaintext passwords on first run
  state.users.forEach(u => { if (u.pw && !u.pw.startsWith("h")) u.pw = hash(u.pw); });

  // ---------- Profile menu ----------
  function closeProfileMenu(){ const m = $("#profileMenu"); if (m) m.hidden = true; }
  function bindHeader(){
    $("#loginBtn").onclick = () => go("login");
    $("#signupBtn").onclick = () => go("signup");
    $("#profileBtn").onclick = e => { e.stopPropagation(); $("#profileMenu").hidden = !$("#profileMenu").hidden; };
    document.addEventListener("click", e => { if (!e.target.closest("#profileWrap")) closeProfileMenu(); });
    $$("#profileMenu button").forEach(b => b.onclick = () => {
      const a = b.dataset.act; closeProfileMenu();
      if (a==="logout") signOut(); else go(a);
    });
  }

  // ---------- Render ----------
  function render(){
    document.documentElement.dataset.theme = state.theme;
    const signedIn = !!state.session;
    $("#loginBtn").hidden = signedIn;
    $("#signupBtn").hidden = signedIn;
    $("#profileWrap").hidden = !signedIn;
    if (signedIn) {
      const u = state.session;
      $("#avatar").textContent = u.name[0].toUpperCase();
      $("#profileName").textContent = u.name.split(" ")[0];
      $("#pmName").textContent = u.name;
      $("#pmEmail").textContent = u.email;
    }
    $("#langBtn").textContent = state.lang.toUpperCase();
    $$("#nav button").forEach(b => { const k=b.dataset.route; if (I18N[state.lang]?.[k]) b.textContent = I18N[state.lang][k]; else b.textContent = I18N.en[k] || b.textContent; });
    go(state.route);
  }

  // ---------- Init ----------
  function init(){
    $("#yr").textContent = new Date().getFullYear();
    $("#themeBtn").onclick = () => { state.theme = state.theme==="light"?"dark":"light"; save(); render(); };
    $("#langBtn").onclick = () => { state.lang = state.lang==="en"?"hi":state.lang==="hi"?"ta":"en"; save(); render(); };
    $("#menuBtn").onclick = () => $("#nav").classList.toggle("open");
    $("#goHome").onclick = () => go("home");
    $$("#nav button").forEach(b => b.onclick = () => go(b.dataset.route));
    bindHeader();

    // Deep link: #login, #signup, or report id
    if (location.hash.length > 1) {
      const h = location.hash.slice(1);
      if (["login","signup","officialLogin","forgot"].includes(h)) state.route = h;
      else {
        const r = state.reports.find(x => x.id === h);
        if (r) { state.route = "detail"; state.params = { id:r.id }; }
      }
    }
    render();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
