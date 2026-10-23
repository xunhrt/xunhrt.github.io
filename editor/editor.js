(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const url = (src) => "/" + String(src).split("/").map(encodeURIComponent).join("/");

  if (!window.PORTFOLIO) {
    $("#panel").innerHTML = `<div class="card">Couldn't load data.js. Start the editor with <b>Edit Portfolio.bat</b>.</div>`;
    return;
  }

  /* ───────── data ───────── */
  const D = JSON.parse(JSON.stringify(window.PORTFOLIO));
  D.profile ??= {};
  D.profile.stats ??= [];
  D.profile.bio ??= [];
  D.projects ??= [];
  D.skills ??= [];
  D.contact ??= [];
  for (const p of D.projects) { p.tags ??= []; p.details ??= []; p.links ??= []; p.gallery ??= []; p.image ??= ""; }

  const TPL = {
    project: () => ({ title: "NEW PROJECT", year: String(new Date().getFullYear()), role: "Developer", tags: [], summary: "", details: [], links: [], image: "", gallery: [] }),
    stat: () => ({ label: "NEW STAT", rank: 3, word: "SKILLED" }),
    group: () => ({ group: "NEW GROUP", items: [] }),
    skill: () => ({ name: "NEW SKILL", value: 50 }),
    contact: () => ({ label: "NEW", value: "", url: "" }),
    link: () => ({ label: "PLAY", url: "" }),
  };

  const keys = (path) => path.split(".").map((k) => (/^\d+$/.test(k) ? +k : k));
  const get = (path) => keys(path).reduce((o, k) => o?.[k], D);
  const set = (path, v) => {
    const ks = keys(path), last = ks.pop();
    ks.reduce((o, k) => o[k], D)[last] = v;
  };

  const fmt = {
    text: (v) => v ?? "",
    number: (v) => v ?? "",
    csv: (v) => (v || []).join(", "),
    lines: (v) => (v || []).join("\n"),
    paras: (v) => (v || []).join("\n\n"),
  };
  const parse = {
    text: (s) => s,
    number: (s) => (s === "" ? "" : Number(s)),
    csv: (s) => s.split(",").map((t) => t.trim()).filter(Boolean),
    lines: (s) => s.split("\n").map((t) => t.trim()).filter(Boolean),
    paras: (s) => s.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean),
  };

  const slug = (s) => String(s || "misc").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "misc";
  const folderFor = (p) => p.gallery.map((g) => /^assets\/([^/]+)\//.exec(g.src)?.[1]).find(Boolean) || slug(p.title);

  /* ───────── UI state ───────── */
  const ui = { tab: ["profile", "projects", "skills", "contact"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "profile", project: 0 };
  let dirty = false;
  const setDirty = (v) => { dirty = v; $("#dirty").classList.toggle("on", v); };

  function toast(msg, err = false) {
    const t = document.createElement("div");
    t.className = "toast" + (err ? " err" : "");
    t.textContent = msg;
    $("#toasts").appendChild(t);
    setTimeout(() => t.remove(), err ? 8000 : 3500);
  }

  /* ───────── building blocks ───────── */
  function field(label, path, kind = "text", o = {}) {
    const v = fmt[kind](get(path));
    const ph = esc(o.ph || "");
    const input = kind === "lines" || kind === "paras" || o.area
      ? `<textarea data-path="${path}" data-kind="${kind}" rows="${o.rows || 3}" placeholder="${ph}">${esc(v)}</textarea>`
      : `<input type="${kind === "number" ? "number" : "text"}" data-path="${path}" data-kind="${kind}" value="${esc(v)}" placeholder="${ph}" ${o.attrs || ""}>`;
    return `<label class="field"><span>${esc(label)}</span>${input}${o.hint ? `<div class="hint">${esc(o.hint)}</div>` : ""}</label>`;
  }

  function imageField(label, path, folder, hint) {
    const v = get(path);
    return `
      <div class="field"><span>${esc(label)}</span>
        <div class="imgfield">
          <div class="preview" style="${v ? `background-image:url('${url(v)}')` : ""}">${v ? "" : "NONE"}</div>
          <div>
            <button class="btn small" data-act="pick" data-path="${path}" data-folder="${folder}">CHOOSE IMAGE</button>
            ${v ? `<button class="btn small danger" data-act="clear" data-path="${path}">REMOVE</button>` : ""}
            ${hint ? `<div class="hint">${esc(hint)}</div>` : ""}
          </div>
        </div>
      </div>`;
  }

  const ctrl = (list, i) => `
    <div class="ctrl">
      <button class="icon" data-act="move" data-list="${list}" data-idx="${i}" data-d="-1" title="Move up">↑</button>
      <button class="icon" data-act="move" data-list="${list}" data-idx="${i}" data-d="1" title="Move down">↓</button>
      <button class="icon x" data-act="del" data-list="${list}" data-idx="${i}" title="Remove">✕</button>
    </div>`;

  const addBtn = (list, tpl, label) => `<button class="btn small" data-act="add" data-list="${list}" data-tpl="${tpl}">+ ${label}</button>`;

  /* ───────── views ───────── */
  const VIEWS = {
    profile() {
      return `
        <h1 class="h">PROFILE</h1>
        <div class="card">
          <div class="grid">
            ${field("NAME", "name")}
            ${field("HANDLE", "handle")}
            ${field("TITLE", "title", "text", { ph: "GAME DEVELOPER" })}
            ${field("ARCANA", "profile.arcana", "text", { hint: "Flavour text on the Profile screen." })}
            ${field("LEVEL", "profile.level", "number")}
          </div>
          <br>
          ${field("TAGLINE", "tagline", "text", { area: true, rows: 2 })}
          <br>
          ${field("BIO", "profile.bio", "paras", { rows: 7, hint: "Leave a blank line between paragraphs." })}
        </div>

        <div class="sub-h">CARD PICTURE</div>
        <div class="card grid">
          ${imageField("PHOTO BEHIND YOUR NAME", "cardBackground", "profile", "Shown tinted blue on the card, menu and Profile screen.")}
          ${imageField("PORTRAIT (OPTIONAL)", "portrait", "profile", "Shown in full colour on the card and the Skills/Contact screens. Overrides the photo above.")}
        </div>

        <div class="sub-h">STATS</div>
        <div class="card">
          ${D.profile.stats.map((s, i) => `
            <div class="lrow stat-row">
              ${field("LABEL", `profile.stats.${i}.label`)}
              <div class="field"><span>RANK</span><div class="rank">${[1, 2, 3, 4, 5].map((n) =>
                `<button data-act="rank" data-path="profile.stats.${i}.rank" data-v="${n}" class="${n <= s.rank ? "on" : ""}" title="${n}"></button>`).join("")}</div></div>
              ${field("WORD", `profile.stats.${i}.word`)}
              ${ctrl("profile.stats", i)}
            </div>`).join("")}
          ${addBtn("profile.stats", "stat", "ADD STAT")}
        </div>`;
    },

    projects() {
      ui.project = Math.max(0, Math.min(ui.project, D.projects.length - 1));
      const i = ui.project, p = D.projects[i];
      const list = `
        <div class="plist" id="plist">
          ${D.projects.map((q, n) => `
            <button class="pitem ${n === i ? "on" : ""}" data-act="selproj" data-idx="${n}">
              <b>${String(n + 1).padStart(2, "0")}</b>${esc(q.title || "UNTITLED")}<small>${esc(q.year)}</small>
            </button>`).join("")}
          ${addBtn("projects", "project", "NEW PROJECT")}
        </div>`;
      if (!p) return `<h1 class="h">PROJECTS</h1><div class="split">${list}<div class="card">No projects yet.</div></div>`;
      const folder = folderFor(p);
      return `
        <h1 class="h">PROJECTS</h1>
        <div class="split">
          ${list}
          <div>
            <div class="toolbar">
              <button class="btn small ghost" data-act="move" data-list="projects" data-idx="${i}" data-d="-1">↑ MOVE UP</button>
              <button class="btn small ghost" data-act="move" data-list="projects" data-idx="${i}" data-d="1">↓ MOVE DOWN</button>
              <button class="btn small danger" data-act="del" data-list="projects" data-idx="${i}">DELETE PROJECT</button>
            </div>
            <div class="card">
              <div class="grid">
                ${field("TITLE", `projects.${i}.title`)}
                ${field("YEAR", `projects.${i}.year`)}
                ${field("ROLE", `projects.${i}.role`)}
              </div>
              <br>
              ${field("TAGS", `projects.${i}.tags`, "csv", { hint: "Separate with commas, e.g. Luau, Combat, AI" })}
              <br>
              ${field("SUMMARY", `projects.${i}.summary`, "text", { area: true, rows: 3 })}
              <br>
              ${field("HIGHLIGHTS", `projects.${i}.details`, "lines", { rows: 4, hint: "One bullet point per line." })}
            </div>

            <div class="sub-h">LINKS</div>
            <div class="card">
              ${p.links.map((l, j) => `
                <div class="lrow link-row">
                  ${field("BUTTON TEXT", `projects.${i}.links.${j}.label`)}
                  ${field("LINK", `projects.${i}.links.${j}.url`, "text", { ph: "https://www.roblox.com/games/..." })}
                  ${ctrl(`projects.${i}.links`, j)}
                </div>`).join("")}
              ${addBtn(`projects.${i}.links`, "link", "ADD LINK")}
            </div>

            <div class="sub-h">COVER IMAGE</div>
            <div class="card">${imageField("SHOWN ABOVE THE TAGS", `projects.${i}.image`, folder, "Optional. Best as a wide 16:9 screenshot.")}</div>

            <div class="sub-h">GALLERY · ${p.gallery.length}</div>
            <div class="card">
              <div class="gallery">
                ${p.gallery.map((g, j) => `
                  <div class="gitem">
                    <div class="thumb" style="background-image:url('${url(g.src)}')"></div>
                    <input type="text" data-path="projects.${i}.gallery.${j}.caption" data-kind="text" value="${esc(g.caption || "")}" placeholder="Caption">
                    <input type="text" data-path="projects.${i}.gallery.${j}.year" data-kind="text" value="${esc(g.year || "")}" placeholder="Year (optional)">
                    <div class="gbtns">
                      <button data-act="move" data-list="projects.${i}.gallery" data-idx="${j}" data-d="-1" title="Move left">◀</button>
                      <button data-act="move" data-list="projects.${i}.gallery" data-idx="${j}" data-d="1" title="Move right">▶</button>
                      <button class="x" data-act="del" data-list="projects.${i}.gallery" data-idx="${j}" title="Remove">✕</button>
                    </div>
                  </div>`).join("")}
              </div>
              <div class="drop" data-act="gadd" data-list="projects.${i}.gallery" data-folder="${folder}">
                + ADD IMAGES<small>Click to choose, or drag images here. They're saved in assets/${esc(folder)}/</small>
              </div>
            </div>
          </div>
        </div>`;
    },

    skills() {
      return `
        <h1 class="h">SKILLS</h1>
        ${D.skills.map((g, i) => `
          <div class="card">
            <div class="lrow" style="grid-template-columns: 1fr auto">
              ${field("GROUP NAME", `skills.${i}.group`)}
              ${ctrl("skills", i)}
            </div>
            ${g.items.map((s, j) => `
              <div class="lrow skill-row">
                ${field("SKILL", `skills.${i}.items.${j}.name`)}
                <label class="field"><span>LEVEL</span><input type="range" min="0" max="100" data-path="skills.${i}.items.${j}.value" data-kind="number" value="${Number(s.value) || 0}"></label>
                ${field("", `skills.${i}.items.${j}.value`, "number", { attrs: 'min="0" max="100"' })}
                ${ctrl(`skills.${i}.items`, j)}
              </div>`).join("")}
            ${addBtn(`skills.${i}.items`, "skill", "ADD SKILL")}
          </div>`).join("")}
        ${addBtn("skills", "group", "ADD GROUP")}`;
    },

    contact() {
      return `
        <h1 class="h">CONTACT</h1>
        <div class="card">
          ${D.contact.map((c, i) => `
            <div class="lrow contact-row">
              ${field("LABEL", `contact.${i}.label`, "text", { ph: "DISCORD" })}
              ${field("SHOWN AS", `contact.${i}.value`)}
              ${field("LINK", `contact.${i}.url`, "text", { ph: "https://... or mailto:..." })}
              ${ctrl("contact", i)}
            </div>`).join("")}
          ${addBtn("contact", "contact", "ADD CONTACT")}
          <div class="hint" style="margin-top:10px">Leave LINK empty and clicking the row copies the text instead (handy for Discord).</div>
        </div>`;
    },
  };

  function render() {
    const y = scrollY;
    document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === ui.tab));
    $("#panel").innerHTML = VIEWS[ui.tab]();
    scrollTo(0, y);
  }

  /* ───────── server calls ───────── */
  async function api(path, body, headers = { "Content-Type": "application/json" }) {
    const r = await fetch(path, { method: "POST", headers, body });
    const j = await r.json().catch(() => ({ error: `Server error (${r.status})` }));
    if (!r.ok) throw new Error(j.error || "Something went wrong");
    return j;
  }
  // version of data.js this page was loaded from; the server refuses saves over newer outside edits
  let baseVersion = null;
  const save = async () => {
    const headers = { "Content-Type": "application/json" };
    if (baseVersion) headers["X-Base-Version"] = baseVersion;
    baseVersion = (await api("/api/save", JSON.stringify(D), headers)).version;
    setDirty(false);
  };
  const upload = async (file, folder) =>
    (await api(`/api/upload?folder=${encodeURIComponent(folder)}&name=${encodeURIComponent(file.name)}`, file, {})).path;

  const pickFiles = (multiple) => new Promise((res) => {
    const i = document.createElement("input");
    i.type = "file"; i.accept = "image/*"; i.multiple = multiple;
    i.onchange = () => res([...i.files]);
    i.click();
  });

  async function addToGallery(list, folder, files) {
    files = files.filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    toast(`Uploading ${files.length} image${files.length > 1 ? "s" : ""}…`);
    for (const f of files) {
      const src = await upload(f, folder);
      const caption = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      get(list).push({ src, caption });
    }
    setDirty(true);
    render();
    toast("Added. Remember to save.");
  }

  /* ───────── events ───────── */
  document.addEventListener("input", (e) => {
    const t = e.target, path = t.dataset.path;
    if (!path || !("kind" in t.dataset)) return;
    set(path, parse[t.dataset.kind](t.value));
    document.querySelectorAll(`input[data-path="${path}"], textarea[data-path="${path}"]`).forEach((el) => { if (el !== t) el.value = t.value; });
    setDirty(true);
    if (/^projects\.\d+\.(title|year)$/.test(path)) {
      const n = +path.split(".")[1];
      const item = $(`#plist [data-idx="${n}"]`);
      if (item) item.innerHTML = `<b>${String(n + 1).padStart(2, "0")}</b>${esc(D.projects[n].title || "UNTITLED")}<small>${esc(D.projects[n].year)}</small>`;
    }
  });

  document.addEventListener("click", async (e) => {
    const tab = e.target.closest("[data-tab]");
    if (tab) { ui.tab = tab.dataset.tab; history.replaceState(null, "", "#" + ui.tab); scrollTo(0, 0); return render(); }

    const b = e.target.closest("[data-act]");
    if (!b) return;
    const { act, list, path, folder } = b.dataset;
    const idx = +b.dataset.idx;
    try {
      if (act === "selproj") { ui.project = idx; scrollTo(0, 0); return render(); }
      if (act === "add") {
        get(list).push(TPL[b.dataset.tpl]());
        if (list === "projects") ui.project = D.projects.length - 1;
      } else if (act === "del") {
        const arr = get(list);
        if (list === "projects" && !confirm(`Delete "${arr[idx].title}"? (Its image files stay in the assets folder.)`)) return;
        if (list === "skills" && !confirm(`Delete the "${arr[idx].group}" group and its skills?`)) return;
        arr.splice(idx, 1);
      } else if (act === "move") {
        const arr = get(list), j = idx + +b.dataset.d;
        if (j < 0 || j >= arr.length) return;
        [arr[idx], arr[j]] = [arr[j], arr[idx]];
        if (list === "projects") ui.project = j;
      } else if (act === "rank") {
        set(path, +b.dataset.v);
      } else if (act === "clear") {
        set(path, "");
      } else if (act === "pick") {
        const [f] = await pickFiles(false);
        if (!f) return;
        set(path, await upload(f, folder));
      } else if (act === "gadd") {
        return await addToGallery(list, folder, await pickFiles(true));
      } else return;
      setDirty(true);
      render();
    } catch (err) {
      toast(err.message, true);
    }
  });

  // drag and drop images onto a gallery
  document.addEventListener("dragover", (e) => {
    e.preventDefault();
    document.querySelectorAll(".drop").forEach((d) => d.classList.toggle("over", d.contains(e.target)));
  });
  document.addEventListener("dragleave", (e) => { if (!e.relatedTarget) document.querySelectorAll(".drop.over").forEach((d) => d.classList.remove("over")); });
  document.addEventListener("drop", async (e) => {
    e.preventDefault();
    const d = e.target.closest(".drop");
    document.querySelectorAll(".drop.over").forEach((x) => x.classList.remove("over"));
    if (!d) return;
    try { await addToGallery(d.dataset.list, d.dataset.folder, [...e.dataTransfer.files]); }
    catch (err) { toast(err.message, true); }
  });

  async function withBusy(btn, fn) {
    const buttons = document.querySelectorAll(".actions .btn");
    buttons.forEach((x) => (x.disabled = true));
    try { await fn(); } catch (err) { toast(err.message, true); }
    finally { buttons.forEach((x) => (x.disabled = false)); }
  }

  $("#saveBtn").addEventListener("click", () => withBusy(null, async () => { await save(); toast("Saved. Click PUBLISH to put it on the live site."); }));
  $("#previewBtn").addEventListener("click", () => {
    const w = window.open("about:blank", "_blank");
    withBusy(null, async () => { await save(); if (w) w.location = "/"; });
  });
  $("#publishBtn").addEventListener("click", () => {
    if (!confirm("Save and publish your changes to the live site?")) return;
    withBusy(null, async () => {
      await save();
      const r = await api("/api/publish", JSON.stringify({ message: "Update portfolio" }));
      toast(r.message);
    });
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      withBusy(null, async () => { await save(); toast("Saved."); });
    }
  });
  addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  fetch("/api/ping")
    .then((r) => { if (!r.ok) throw 0; return r.json(); })
    .then((j) => { baseVersion = j.version; })
    .catch(() => { $("#offline").hidden = false; });

  render();
})();
