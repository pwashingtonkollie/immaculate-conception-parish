document.addEventListener("DOMContentLoaded", async () => {
  const client = window.parishSupabase;
  const welcome = document.getElementById("welcomeText");
  const status = document.getElementById("statusMessage");
  const listMessage = document.getElementById("parishionerMessage");
  const rows = document.getElementById("parishionerRows");
  const search = document.getElementById("searchInput");

  function showError(el, prefix, error) {
    console.error(prefix, error);
    el.textContent = prefix + (error?.message ? " " + error.message : " Please check your connection and settings.");
  }

  if (!client) {
    status.textContent = window.parishConfigProblem || "Configuration error: set the Supabase publishable key in js/config.js.";
    listMessage.textContent = "Parishioners could not load because the Supabase client is not configured.";
    return;
  }

  async function withTimeout(promise, label) {
    let timer;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + " timed out after 15 seconds. Check your connection and Supabase project status.")), 15000); })
      ]);
    } finally { clearTimeout(timer); }
  }

  async function loadProfile() {
    welcome.textContent = "Loading administrator information…";
    try {
      const { data: userResult, error: userError } = await withTimeout(client.auth.getUser(), "Checking login");
      if (userError) throw userError;
      if (!userResult.user) { window.location.replace("index.html"); return false; }

      const { data: profile, error } = await withTimeout(
        client.from("user_profiles").select("full_name, role, is_active").eq("id", userResult.user.id).maybeSingle(),
        "Loading administrator profile"
      );
      if (error) throw error;
      if (!profile) throw new Error("No user_profiles record matches the logged-in Auth user ID.");
      if (!profile.is_active) throw new Error("This account is inactive.");
      welcome.textContent = "Welcome, " + profile.full_name + " — Role: " + profile.role;
      status.textContent = "Administrator profile loaded successfully.";
      return true;
    } catch (error) {
      showError(status, "Could not load administrator profile:", error);
      welcome.textContent = "Parish Dashboard";
      return false;
    }
  }

  let allParishioners = [];
  function renderRows() {
    const term = (search.value || "").trim().toLowerCase();
    const filtered = allParishioners.filter(p =>
      String(p.first_name || "").toLowerCase().includes(term) ||
      String(p.last_name || "").toLowerCase().includes(term)
    );
    rows.replaceChildren();
    for (const p of filtered) {
      const tr = document.createElement("tr");
      for (const value of [p.first_name, p.last_name, p.status]) {
        const td = document.createElement("td");
        td.textContent = value == null ? "" : String(value);
        tr.appendChild(td);
      }
      rows.appendChild(tr);
    }
    listMessage.textContent = filtered.length
      ? filtered.length + " parishioner record(s) shown."
      : "No matching parishioner records found.";
  }

  function setStats(rows, total) {
    const set = (id, v) => { document.getElementById(id).textContent = v; };
    const genderOf = p => String(p.gender ?? p.sex ?? "").trim().toLowerCase();
    const hasGender = rows.some(p => "gender" in p || "sex" in p);
    set("statTotal", total);
    set("statActive", rows.filter(p => String(p.status || "").trim().toLowerCase() === "active").length);
    set("statMale", hasGender ? rows.filter(p => ["male", "m"].includes(genderOf(p))).length : "—");
    set("statFemale", hasGender ? rows.filter(p => ["female", "f"].includes(genderOf(p))).length : "—");
  }

  async function loadParishioners() {
    listMessage.textContent = "Loading parishioners…";
    try {
      const { data, error, count } = await withTimeout(
        client.from("parishioners").select("*", { count: "exact" }).range(0, 999),
        "Loading parishioners"
      );
      if (error) throw error;
      allParishioners = (data || []).sort((a, b) =>
        String(a.last_name || "").localeCompare(String(b.last_name || "")));
      setStats(allParishioners, count ?? allParishioners.length);
      renderRows();
      if ((count ?? 0) > allParishioners.length) {
        listMessage.textContent += " (Showing the first " + allParishioners.length + " of " + count + ".)";
      }
    } catch (error) {
      showError(listMessage, "Could not load parishioners:", error);
    }
  }

  document.getElementById("logoutButton").addEventListener("click", async () => {
    const { error } = await client.auth.signOut();
    if (error) status.textContent = "Sign-out error: " + error.message;
    else window.location.replace("index.html");
  });
  document.getElementById("refreshButton").addEventListener("click", loadParishioners);
  search.addEventListener("input", renderRows);

  const loggedIn = await loadProfile();
  if (loggedIn) await loadParishioners();
});
