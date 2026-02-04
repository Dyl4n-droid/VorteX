/* js/app.js - single frontend script (API + UI)
   IMPORTANT: update API_BASE only if your Replit URL changes.
*/
const API_BASE = "https://vorte-x--dylansaulrosa.replit.app"; // <- CORRECT URL

/* ---------- Small helpers ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function showStatus(msg, type = "info") {
  const el = $("#opStatus");
  el.textContent = msg;
  el.style.color = type === "error" ? "#fca5a5" : type === "ok" ? "#bbf7d0" : "";
}

/* ---------- API wrapper ---------- */
async function apiFetch(path, opts = {}) {
  const url = API_BASE + path;
  try {
    const res = await fetch(url, {
      credentials: "include",
      ...opts
    });
    // Try parse json safely
    const text = await res.text();
    try {
      return { ok: res.ok, json: JSON.parse(text) };
    } catch(e) {
      return { ok: res.ok, json: text };
    }
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

/* ---------- Guilds & Auth (frontend side) ---------- */
async function loadGuilds() {
  showStatus("Loading servers...");
  const { ok, json, error } = await apiFetch("/api/guilds");
  if (!ok) {
    // If backend doesn't expose /api/guilds yet, allow manual guild id
    showStatus("Could not fetch servers from backend. Paste Guild ID manually or implement /api/guilds at backend.", "error");
    return;
  }
  const select = $("#guildSelect");
  select.innerHTML = '<option value="">Select a server (guild)</option>';
  if (Array.isArray(json)) {
    json.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.name;
      select.appendChild(opt);
    });
    showStatus("Servers loaded. Choose one.", "ok");
  } else {
    showStatus("Unexpected response from /api/guilds", "error");
  }
}

function openLogin() {
  // This assumes your Replit backend exposes an OAuth redirect at /auth/discord
  // If not implemented yet, this will 404. Implement OAuth server-side to use.
  window.location.href = `${API_BASE}/auth/discord`;
}

/* ---------- Load & Save config ---------- */
async function loadConfigForGuild(guildId) {
  if (!guildId) {
    showStatus("No guild selected.");
    return;
  }
  showStatus("Loading server configuration...");
  const { ok, json, error } = await apiFetch(`/api/guild/${guildId}/config`);
  if (!ok) {
    showStatus("No config found or endpoint missing. You can still save a new config.", "error");
    return;
  }
  // Fill inputs if json has values (use safe access)
  $("#prefixInput").value = json.prefix ?? "";
  $("#timezoneInput").value = json.timezone ?? "";
  $("#welcomeChannel").value = json.welcomeChannel ?? "";
  $("#welcomeMessage").value = json.welcomeMessage ?? "";
  $("#welcomeImage").value = json.welcomeImage ?? "";
  $("#maxWarns").value = json.maxWarns ?? "";
  $("#antispam").value = String(json.antispam ?? "true");
  $("#logChannel").value = json.logChannel ?? "";
  $("#ticketCategory").value = json.ticketCategory ?? "";
  $("#ticketTranscript").value = json.ticketTranscript ?? "";
  showStatus("Configuration loaded.", "ok");
}

async function saveConfigForGuild(guildId) {
  const gid = guildId || $("#manualGuild").value.trim();
  if (!gid) {
    showStatus("Please select or paste a Guild ID first.", "error");
    return;
  }

  const payload = {
    prefix: $("#prefixInput").value.trim(),
    timezone: $("#timezoneInput").value.trim(),
    welcomeChannel: $("#welcomeChannel").value.trim(),
    welcomeMessage: $("#welcomeMessage").value.trim(),
    welcomeImage: $("#welcomeImage").value.trim(),
    maxWarns: Number($("#maxWarns").value || 0),
    antispam: $("#antispam").value === "true",
    logChannel: $("#logChannel").value.trim(),
    ticketCategory: $("#ticketCategory").value.trim(),
    ticketTranscript: $("#ticketTranscript").value.trim()
  };

  showStatus("Saving configuration...");
  const { ok, json, error } = await apiFetch(`/api/guild/${gid}/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!ok) {
    showStatus("Failed to save config. Check backend logs or endpoint.", "error");
    return;
  }
  showStatus("Configuration saved successfully.", "ok");
}

/* ---------- UI & navigation ---------- */
function switchPage(pageKey) {
  const mapping = {
    overview: "#overviewPage",
    general: "#generalPage",
    welcome: "#welcomePage",
    moderation: "#moderationPage",
    tickets: "#ticketsPage",
    roles: "#rolesPage"
  };
  // update title
  $("#pageTitle").textContent = pageKey.charAt(0).toUpperCase() + pageKey.slice(1);
  // hide all
  $$(".page").forEach(p => p.classList.add("hidden"));
  // show requested
  const sel = mapping[pageKey];
  if (sel) document.querySelector(sel).classList.remove("hidden");
  // active nav
  $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.page === pageKey));
}

/* ---------- Events ---------- */
function setupEvents() {
  // nav
  $$(".nav-btn").forEach(b => {
    b.addEventListener("click", () => switchPage(b.dataset.page));
  });

  $("#loginBtn").addEventListener("click", openLogin);

  $("#guildSelect").addEventListener("change", (e) => {
    const id = e.target.value;
    if (id) {
      loadConfigForGuild(id);
      $("#manualGuild").value = "";
    }
  });

  $("#saveBtn").addEventListener("click", async () => {
    const selected = $("#guildSelect").value;
    await saveConfigForGuild(selected);
  });

  $("#previewBtn").addEventListener("click", () => {
    // Quick preview for welcome message
    const sample = $("#welcomeMessage").value || "Welcome {user} to {server}!";
    alert("Preview:\n\n" + sample.replace("{user}", "ExampleUser").replace("{server}", "ExampleServer"));
  });
}

/* ---------- Init ---------- */
async function init() {
  // navigation default
  switchPage("overview");
  setupEvents();

  // try load guilds (if backend supports it)
  await loadGuilds();

  // try load config if manual guild set
  const manual = $("#manualGuild");
  manual.addEventListener("change", (e) => {
    const id = e.target.value.trim();
    if (id) loadConfigForGuild(id);
  });

  showStatus("Ready. Connect your Discord account to load servers (if implemented).");
}

document.addEventListener("DOMContentLoaded", init);