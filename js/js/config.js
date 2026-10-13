*/ window.PARISH_CONFIG = {
  SUPABASE_URL: "https://cyymcqxoommqfrrnlmtb.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: " Psb_publishable_EjEI5Tk8vGB6ofuRt0OJyg_AlucsYY"
};

(function () {
  const cfg = window.PARISH_CONFIG;
  const key = cfg.SUPABASE_PUBLISHABLE_KEY || "";
  window.parishSupabase = null;
  window.parishConfigProblem = null;

  if (!window.supabase) {
    window.parishConfigProblem = "The Supabase library did not load. Check your internet connection and try again.";
    return;
  }
  if (!key || key.includes("REPLACE_WITH")) {
    window.parishConfigProblem = "Setup needed: add your Supabase publishable key in js/config.js.";
    return;
  }
  if (key.startsWith("sb_secret_")) {
    window.parishConfigProblem = "Unsafe key: a secret key must never be used in browser code. Use the publishable key.";
    return;
  }
  if (key.startsWith("eyJ")) {
    // Legacy JWT keys: accept the public "anon" key only.
    try {
      const payload = JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.role !== "anon") {
        window.parishConfigProblem = "Unsafe key: this key's role is '" + payload.role + "'. Use the publishable (anon) key only.";
        return;
      }
    } catch (e) {
      window.parishConfigProblem = "The key in js/config.js could not be read. Copy it again from Supabase.";
      return;
    }
  } else if (!key.startsWith("sb_publishable_")) {
    window.parishConfigProblem = "The key in js/config.js should start with sb_publishable_.";
    return;
  }
  window.parishSupabase = window.supabase.createClient(cfg.SUPABASE_URL, key);
