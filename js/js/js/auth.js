document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");
  const button = document.getElementById("loginButton");

  if (!window.parishSupabase) {
    message.textContent = window.parishConfigProblem || "Setup needed: add your Supabase publishable key in js/config.js.";
    button.disabled = true;
    return;
  }

  // If the person is already signed in, go straight to the dashboard.
  window.parishSupabase.auth.getUser().then(({ data }) => {
    if (data && data.user) window.location.replace("dashboard.html");
  }).catch(() => {});

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "Signing in…";
    button.disabled = true;
    try {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const { data, error } = await window.parishSupabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Login succeeded but no user was returned.");

      const { data: profile, error: profileError } = await window.parishSupabase
        .from("user_profiles")
        .select("full_name, role, is_active")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        await window.parishSupabase.auth.signOut();
        throw new Error("Signed in, but the profile could not be loaded: " + profileError.message);
      }
      if (!profile) {
        await window.parishSupabase.auth.signOut();
        throw new Error("No user_profiles row matches this login's Auth user ID.");
      }
      if (!profile.is_active) {
        await window.parishSupabase.auth.signOut();
        throw new Error("This account is inactive. Contact the main administrator.");
      }

      window.location.href = "dashboard.html";
    } catch (error) {
      message.textContent = error.message || "Login failed. Please try again.";
    } finally {
      button.disabled = false;
    }
  });
});
