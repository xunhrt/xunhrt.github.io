(() => {
  const P = window.PORTFOLIO;
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const MENU = [
    { id: "profile",  label: "PROFILE",  sub: "WHO AM I" },
    { id: "projects", label: "PROJECTS", sub: `${P.projects.length} ENTRIES` },
    { id: "skills",   label: "SKILLS",   sub: "STATUS" },
    { id: "contact",  label: "CONTACT",  sub: "LINK UP" },
  ];

  const state = { screen: "menu", sel: { menu: 0, projects: 0, contact: 0 } };

  /* ───────── HUD ───────── */
  document.title = `${P.name} // Portfolio`;
  $("#hudName").innerHTML = `<span>PORTFOLIO // ${esc(P.name)}</span>`;
  $("#hudTitle").innerHTML = `<span>${esc(P.title)}</span>`;

  function tickClock() {
    const d = new Date();
    const h = d.getHours();
    const phase = h < 5 ? "DARK HOUR" : h < 12 ? "MORNING" : h < 17 ? "AFTERNOON" : h < 20 ? "EVENING" : "LATE NIGHT";
    $("#clockDate").textContent = `${d.getMonth() + 1}/${d.getDate()}`;
    $("#clockDay").textContent = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    $("#clockTime").textContent = phase;
  }
  tickClock();
  setInterval(tickClock, 60_000);

  /* ───────── shared bits ───────── */
  const initial = (P.name.trim()[0] || "?").toUpperCase();
  const card = () => `
    <div class="card">
      <div class="card-frame">
        ${P.cardBackground && !P.portrait ? `<img class="card-bg" src="${esc(P.cardBackground)}" alt="">` : ""}
        ${P.portrait ? `<img src="${esc(P.portrait)}" alt="${esc(P.name)}">` : P.cardBackground ? "" : `<div class="card-initial">${esc(initial)}</div>`}
      </div>
      <div class="card-outline"></div>
      <div class="card-lv">LV<b>${esc(P.profile.level)}</b></div>
      <div class="card-name">${esc(P.name)}</div>
    </div>`;

  const sideArt = (cap) => `
    <div class="side-art">
      ${P.portrait ? `<img src="${esc(P.portrait)}" alt="">` : `<div class="glyph">${esc(initial)}</div>`}
      <div class="cap"><span style="display:inline-block;transform:skewX(12deg)">${esc(cap)}</span></div>
    </div>`;

  /* ───────── render screens ───────── */
  function renderMenu() {
    $("#screen-menu").innerHTML = `
      <div class="menu-wrap">
        <ul class="menu-list">
          ${MENU.map((m, i) => `
            <li class="menu-item" data-i="${i}" style="--i:${i}">
              ${m.label}<span class="sub">${esc(m.sub)}</span>
            </li>`).join("")}
        </ul>
        ${card()}
      </div>`;
  }

  function renderProfile() {
    const pr = P.profile;
    $("#screen-profile").innerHTML = `
      <div class="title-tag">PROFILE</div>
      <div class="prof-wrap">
        ${card()}
        <div class="prof-right">
          <div class="prof-arcana">ARCANA · ${esc(pr.arcana)}</div>
          <p class="prof-tagline">${esc(P.tagline)}</p>
          <div class="prof-bio">${pr.bio.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
          <div class="stats">
            ${pr.stats.map((s) => `
              <div class="stat">
                <span class="stat-label">${esc(s.label)}</span>
                <span class="stat-pips">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= s.rank ? "on" : ""}"></i>`).join("")}</span>
                <span class="stat-word">${esc(s.word)}</span>
              </div>`).join("")}
          </div>
        </div>
      </div>`;
  }

  function renderProjects() {
    $("#screen-projects").innerHTML = `
      <div class="proj-wrap">
        <div class="proj-left">
          <div class="title-tag">PROJECTS</div>
          <ul class="proj-list">
            ${P.projects.map((p, i) => `
              <li class="proj-row" data-i="${i}">
                <span class="proj-num">${String(i + 1).padStart(2, "0")}</span>
                <span class="proj-name">${esc(p.title)}</span>
                <span class="proj-year">${esc(p.year)}</span>
              </li>`).join("")}
          </ul>
        </div>
        <article class="proj-detail" id="projDetail"></article>
      </div>`;
  }

  function renderProjectDetail() {
    const p = P.projects[state.sel.projects];
    const el = $("#projDetail");
    if (!p || !el) return;
    el.innerHTML = `
      <div class="pd-head">
        <span class="pd-year"><span style="display:inline-block;transform:skewX(12deg)">${esc(p.year)}</span></span>
        <span class="pd-role">${esc(p.role)}</span>
      </div>
      <h2 class="pd-title">${esc(p.title)}</h2>
      ${p.image ? `<img class="pd-img" src="${esc(p.image)}" alt="">` : ""}
      ${p.tags?.length ? `<div class="pd-tags">${p.tags.map((t) => `<span class="pd-tag">${esc(t)}</span>`).join("")}</div>` : ""}
      <p class="pd-summary">${esc(p.summary)}</p>
      ${p.details?.length ? `<ul class="pd-details">${p.details.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}
      ${p.gallery?.length ? `
        <div class="pd-gallery-label">GALLERY · ${p.gallery.length}</div>
        <div class="pd-gallery">${p.gallery.map((g, n) => `
          <button class="pd-thumb" data-g="${n}" aria-label="${esc(g.caption || `Image ${n + 1}`)}">
            <img src="${esc(g.src)}" alt="${esc(g.caption || "")}" loading="lazy">
            ${g.caption ? `<span>${esc(g.caption)}</span>` : ""}
            ${g.year ? `<em class="pd-thumb-year">${esc(g.year)}</em>` : ""}
          </button>`).join("")}
        </div>` : ""}
      ${p.links?.length ? `<div class="pd-links">${p.links.map((l) => `<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ▸</a>`).join("")}</div>` : ""}`;
    el.classList.remove("swap");
    void el.offsetWidth;
    el.classList.add("swap");
    el.scrollTop = 0;
  }

  function renderSkills() {
    $("#screen-skills").innerHTML = `
      ${sideArt(`${P.handle} · ${P.title}`)}
      <div class="title-tag">SKILLS</div>
      <div class="skills-grid">
        ${P.skills.map((g) => `
          <div class="sk-group">
            <div class="sk-label"><span style="display:inline-block;transform:skewX(12deg)">${esc(g.group)}</span></div>
            ${g.items.map((s) => `
              <div class="sk-row ${s.value >= 90 ? "hot" : ""}">
                <span class="sk-name">${esc(s.name)}</span>
                <span class="sk-bar"><span class="sk-fill" data-v="${Number(s.value) || 0}"></span></span>
                <span class="sk-val">${esc(s.value)}</span>
              </div>`).join("")}
          </div>`).join("")}
      </div>`;
  }

  function renderContact() {
    $("#screen-contact").innerHTML = `
      ${sideArt("SEND A MESSAGE")}
      <div class="title-tag">CONTACT</div>
      <ul class="contact-list">
        ${P.contact.map((c, i) => `
          <li class="contact-row" data-i="${i}">
            <span class="c-label">${esc(c.label)}</span>
            <span class="c-value">${esc(c.value)}</span>
          </li>`).join("")}
      </ul>`;
  }

  renderMenu();
  renderProfile();
  renderProjects();
  renderSkills();
  renderContact();

  /* ───────── selection ───────── */
  const listFor = {
    menu: () => document.querySelectorAll("#screen-menu .menu-item"),
    projects: () => document.querySelectorAll("#screen-projects .proj-row"),
    contact: () => document.querySelectorAll("#screen-contact .contact-row"),
  };

  function select(screen, i, { scroll = true } = {}) {
    const items = listFor[screen]?.();
    if (!items?.length) return;
    i = (i + items.length) % items.length;
    const changed = state.sel[screen] !== i;
    state.sel[screen] = i;
    items.forEach((el, n) => el.classList.toggle("selected", n === i));
    if (scroll) items[i].scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (screen === "projects" && (changed || !$("#projDetail").innerHTML)) renderProjectDetail();
  }

  function confirm(screen) {
    const i = state.sel[screen];
    if (screen === "menu") return go(MENU[i].id);
    if (screen === "projects") {
      const link = P.projects[i]?.links?.[0];
      if (link && link.url && link.url !== "#") window.open(link.url, "_blank", "noopener");
      return;
    }
    if (screen === "contact") {
      const c = P.contact[i];
      if (c.url && c.url !== "#") return window.open(c.url, "_blank", "noopener");
      navigator.clipboard?.writeText(c.value).then(() => toast(`${c.label} COPIED`), () => {});
    }
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<span style="display:inline-block;transform:skewX(12deg)">${esc(msg)}</span>`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1700);
  }

  /* ───────── image viewer ───────── */
  const viewer = { open: false, list: [], i: 0 };
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.innerHTML = `
    <button class="lb-nav lb-prev" aria-label="Previous">◀</button>
    <figure><img alt=""><figcaption><b class="lb-count"></b><span class="lb-cap"></span><i class="lb-year"></i></figcaption></figure>
    <button class="lb-nav lb-next" aria-label="Next">▶</button>
    <button class="lb-close" aria-label="Close">ESC ✕</button>`;
  document.body.appendChild(lb);

  function viewerShow(i) {
    viewer.i = (i + viewer.list.length) % viewer.list.length;
    const g = viewer.list[viewer.i];
    $("img", lb).src = g.src;
    $("img", lb).alt = g.caption || "";
    $(".lb-count", lb).textContent = `${String(viewer.i + 1).padStart(2, "0")} / ${String(viewer.list.length).padStart(2, "0")}`;
    $(".lb-cap", lb).textContent = g.caption || "";
    $(".lb-year", lb).textContent = g.year || "";
    const fig = $("figure", lb);
    fig.classList.remove("pop"); void fig.offsetWidth; fig.classList.add("pop");
  }
  function viewerOpen(list, i) { viewer.list = list; viewer.open = true; lb.classList.add("open"); viewerShow(i); }
  function viewerClose() { viewer.open = false; lb.classList.remove("open"); }

  lb.addEventListener("click", (e) => {
    if (e.target.closest(".lb-prev")) return viewerShow(viewer.i - 1);
    if (e.target.closest(".lb-next")) return viewerShow(viewer.i + 1);
    if (e.target.closest(".lb-close") || e.target === lb) viewerClose();
  });

  /* ───────── navigation ───────── */
  const BG_WORDS = { menu: "PORTFOLIO", profile: "PROFILE", projects: "PROJECTS", skills: "STATUS", contact: "CONTACT" };
  let busy = false;

  function show(screen) {
    state.screen = screen;
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.dataset.screen === screen));
    $("#bgWord").textContent = BG_WORDS[screen];
    $("#backKey").style.visibility = screen === "menu" ? "hidden" : "visible";
    if (listFor[screen]) select(screen, state.sel[screen], { scroll: false });
    if (screen === "skills") {
      document.querySelectorAll(".sk-fill").forEach((f) => (f.style.width = "0"));
      requestAnimationFrame(() => requestAnimationFrame(() =>
        document.querySelectorAll(".sk-fill").forEach((f, n) => setTimeout(() => (f.style.width = f.dataset.v + "%"), n * 40))));
    }
  }

  function go(screen, { animate = true, push = true } = {}) {
    if (busy || screen === state.screen) return;
    if (push) history.pushState(null, "", screen === "menu" ? location.pathname : `#${screen}`);
    if (!animate || matchMedia("(prefers-reduced-motion: reduce)").matches) return show(screen);
    busy = true;
    const w = $("#wipe");
    w.classList.remove("go");
    void w.offsetWidth;
    w.classList.add("go");
    setTimeout(() => { show(screen); window.scrollTo(0, 0); }, 260);
    setTimeout(() => { busy = false; w.classList.remove("go"); }, 720);
  }

  const back = () => state.screen !== "menu" && go("menu");

  window.addEventListener("popstate", () => go(location.hash.slice(1) || "menu", { push: false }));

  document.addEventListener("keydown", (e) => {
    if (viewer.open) {
      if (["ArrowLeft", "a", "A", "ArrowUp"].includes(e.key)) viewerShow(viewer.i - 1);
      else if (["ArrowRight", "d", "D", "ArrowDown"].includes(e.key)) viewerShow(viewer.i + 1);
      else if (["Escape", "Backspace", "Enter", " "].includes(e.key)) viewerClose();
      e.preventDefault();
      return;
    }
    const s = state.screen;
    const k = e.key;
    if (["ArrowUp", "w", "W"].includes(k) && listFor[s]) { e.preventDefault(); select(s, state.sel[s] - 1); }
    else if (["ArrowDown", "s", "S"].includes(k) && listFor[s]) { e.preventDefault(); select(s, state.sel[s] + 1); }
    else if (k === "Enter" || k === " ") { if (listFor[s]) { e.preventDefault(); confirm(s); } }
    else if (k === "Escape" || k === "Backspace") { e.preventDefault(); back(); }
  });

  // mouse: hover selects, click confirms
  document.addEventListener("mouseover", (e) => {
    const row = e.target.closest(".menu-item, .contact-row");
    if (row) select(state.screen, Number(row.dataset.i), { scroll: false });
  });
  document.addEventListener("click", (e) => {
    const thumb = e.target.closest(".pd-thumb");
    if (thumb) return viewerOpen(P.projects[state.sel.projects].gallery, Number(thumb.dataset.g));
    const row = e.target.closest(".menu-item, .contact-row, .proj-row");
    if (!row) return;
    const i = Number(row.dataset.i);
    if (row.classList.contains("proj-row")) return select("projects", i, { scroll: false });
    select(state.screen, i, { scroll: false });
    confirm(state.screen);
  });
  $("#backKey").addEventListener("click", back);

  // initial screen from URL hash
  const start = location.hash.slice(1);
  show(BG_WORDS[start] ? start : "menu");
})();
