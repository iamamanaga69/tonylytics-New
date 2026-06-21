/* ============================================================
   DuoGym / FitRivals — Core Configuration & UI Utilities
   ============================================================ */

const AUTH_STORAGE_KEY = 'duogym_auth_session';

// --- High-Performance DOM Cache Utility ---
const DOM = {
  cache: {},
  get(id) {
    if (!this.cache[id]) {
      this.cache[id] = document.getElementById(id);
    }
    return this.cache[id];
  },
  clear() {
    this.cache = {};
  }
};

// --- High-Performance Calculation Memoization Caches ---
const dietAggregatesCache = {};
const streaksCache = {};
const activityStreaksCache = {};

function invalidateDietCache(username) {
  const prefix = `${username}_`;
  for (const key in dietAggregatesCache) {
    if (key.startsWith(prefix)) {
      delete dietAggregatesCache[key];
    }
  }
}

function invalidateStreaksCache(username) {
  delete streaksCache[username];
}

function invalidateActivityStreaksCache(username) {
  delete activityStreaksCache[username];
}

// --- Auth State Management ---
let isAuthenticated = false;
let authenticatedUser = null;

// --- Login UI Helpers ---
function toggleLoginPassword() {
  const input = DOM.get('login-password');
  const btn = document.querySelector('.login-eye-btn');
  if (input) {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    if (btn) btn.innerHTML = isPassword ? '👁️' : '🔒';
  }
}

// Remember me is visually handled by UI layout toggles.
function toggleLoginRemember() {
  const toggle = DOM.get('login-remember-toggle');
  if (toggle) {
    toggle.classList.toggle('active');
  }
}

// Handle Enter key on password field
function handleLoginKeypress(event) {
  if (event.key === 'Enter') {
    handleLogin();
  }
}

/* ============================================================
   Supabase Cloud Sync Module
   ============================================================
   Syncs workout, diet, and profile data to Supabase.
   Falls back gracefully if Supabase is not configured.
   ============================================================ */

let SUPABASE_URL = "https://jjyfhkkuraqkfjlwzkfw.supabase.co";
let SUPABASE_ANON_KEY = "sb_publishable_qIFkO2NSVVcImNYzKrCWyA_l9ZrKGwX";
const SUPABASE_PROJECT_REF = "jjyfhkkuraqkfjlwzkfw";

let supabaseClient = null;
let supabaseInitialized = false;
let syncStatus = 'offline'; // 'synced', 'syncing', 'offline'
let syncDebounceTimer = null;
let supabaseRealtimeChannel = null;
let supabaseRivalRealtimeChannel = null;
let lastSyncedPayload = null;
let lastOpponentSyncAt = 0;
let opponentSyncInFlight = false;

/* FitRivals Supabase Auth v2. These declarations intentionally replace the
   original two-account local login while preserving existing stored fitness data. */
let authenticatedProfile = null;
let authMode = "signin";

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function isValidUsername(value) {
  return /^[a-z0-9_]{3,24}$/.test(value);
}

function getAuthRedirectUrl() {
  const isNative = typeof AndroidApp !== "undefined" && Boolean(AndroidApp.openOAuth);
  return isNative
    ? "fitrivals://auth/callback"
    : `${window.location.origin}${window.location.pathname}`;
}

function migrateSupabaseProjectConfig() {
  if (safeStorage.getItem("fitrivals_supabase_project") === SUPABASE_PROJECT_REF) return;
  safeStorage.setItem("duogym_supabase_url", SUPABASE_URL);
  safeStorage.setItem("duogym_supabase_key", SUPABASE_ANON_KEY);
  safeStorage.setItem("fitrivals_supabase_project", SUPABASE_PROJECT_REF);
  clearAuthSession();
}

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (typeof supabase === "undefined") return null;
  migrateSupabaseProjectConfig();
  const activeUrl = safeStorage.getItem("duogym_supabase_url") || SUPABASE_URL;
  const activeKey = safeStorage.getItem("duogym_supabase_key") || SUPABASE_ANON_KEY;
  if (!activeUrl || !activeKey) return null;
  supabaseClient = supabase.createClient(activeUrl, activeKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
  supabaseInitialized = true;
  return supabaseClient;
}

function getAuthSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null");
  } catch (_) {
    return null;
  }
}

function setAuthSession(profile) {
  authenticatedProfile = profile;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
}

function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function setAuthMode(mode) {
  authMode = mode === "signup" ? "signup" : "signin";
  document.querySelector(".login-card")?.classList.toggle("auth-signup", authMode === "signup");
  DOM.get("auth-tab-signin")?.classList.toggle("active", authMode === "signin");
  DOM.get("auth-tab-signup")?.classList.toggle("active", authMode === "signup");
  const identityLabel = DOM.get("auth-identity-label");
  const identityInput = DOM.get("auth-identity");
  const buttonText = document.querySelector("#login-btn .login-btn-text");
  if (identityLabel) identityLabel.textContent = authMode === "signup" ? "Username" : "Username or email";
  if (identityInput) identityInput.placeholder = authMode === "signup" ? "Choose a unique username" : "Username or email";
  if (buttonText) buttonText.textContent = authMode === "signup" ? "Create Account" : "Sign In";
  hideLoginError();
}

function hideLoginError() {
  DOM.get("login-error")?.classList.remove("visible");
}

function showLoginError(message) {
  const errorEl = DOM.get("login-error");
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.classList.add("visible");
}

async function resolveLoginEmail(identity) {
  const value = String(identity || "").trim().toLowerCase();
  if (value.includes("@")) return value;
  const username = normalizeUsername(value);
  if (!isValidUsername(username)) throw new Error("Enter a valid username or email.");
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("resolve_fitrivals_login", { login_name: username });
  if (error) throw new Error("Username login needs the included Supabase setup SQL.");
  const email = Array.isArray(data) ? data[0]?.email : data?.email || data;
  if (!email) throw new Error("No account found for that username.");
  return String(email);
}

async function loadOrCreateAuthProfile(user, preferredUsername = "", displayName = "") {
  const client = getSupabaseClient();
  const metadata = user.user_metadata || {};
  const { data: existing, error: readError } = await client
    .from("fitrivals_profiles")
    .select("id, username, display_name, rival_username")
    .eq("id", user.id)
    .maybeSingle();
  if (readError) throw readError;
  if (existing) return existing;

  const base = (normalizeUsername(
    preferredUsername || metadata.username || metadata.user_name ||
    metadata.preferred_username || String(user.email || "").split("@")[0]
  ) || `athlete_${String(user.id).slice(0, 8)}`).slice(0, 24);

  for (let attempt = 0; attempt < 5; attempt++) {
    const username = attempt === 0 ? base : `${base.slice(0, 18)}_${String(user.id).slice(0, 4 + attempt)}`;
    const row = {
      id: user.id,
      username,
      display_name: String(displayName || metadata.full_name || metadata.name || username).trim().slice(0, 40),
      auth_email: String(user.email || "").toLowerCase()
    };
    const { data, error } = await client
      .from("fitrivals_profiles")
      .insert(row)
      .select("id, username, display_name, rival_username")
      .single();
    if (!error && data) return data;
    if (error?.code !== "23505") throw error;
  }
  throw new Error("That username is already taken. Please choose another.");
}

async function handleLogin() {
  const button = DOM.get("login-btn");
  if (!button) return;
  hideLoginError();
  const identity = DOM.get("auth-identity")?.value.trim() || "";
  const email = DOM.get("auth-email")?.value.trim().toLowerCase() || "";
  const displayName = DOM.get("auth-display-name")?.value.trim() || "";
  const password = DOM.get("login-password")?.value || "";
  if (password.length < 8) {
    showLoginError("Password must be at least 8 characters.");
    return;
  }
  button.classList.add("loading");
  try {
    const client = getSupabaseClient();
    if (!client) throw new Error("Cloud sign-in is unavailable.");
    let result;
    let preferredUsername = "";
    if (authMode === "signup") {
      preferredUsername = normalizeUsername(identity);
      if (!isValidUsername(preferredUsername)) throw new Error("Username must be 3–24 letters, numbers, or underscores.");
      if (!email || !email.includes("@")) throw new Error("Enter a valid email.");
      if (!displayName) throw new Error("Enter your display name.");
      result = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          data: { username: preferredUsername, full_name: displayName }
        }
      });
    } else {
      const loginEmail = await resolveLoginEmail(identity);
      result = await client.auth.signInWithPassword({ email: loginEmail, password });
    }
    if (result.error) throw result.error;
    if (!result.data.user) throw new Error("Authentication did not return a user.");
    if (!result.data.session) {
      showLoginError("Check your email to confirm the account, then sign in.");
      return;
    }
    const profile = await loadOrCreateAuthProfile(result.data.user, preferredUsername, displayName);
    finishSupabaseLogin(profile);
  } catch (error) {
    console.warn("FitRivals authentication failed", error);
    showLoginError(error?.message || "Unable to authenticate.");
  } finally {
    button.classList.remove("loading");
  }
}

async function handleOAuthLogin(provider) {
  hideLoginError();
  try {
    const client = getSupabaseClient();
    if (!client) throw new Error("Cloud sign-in is unavailable.");
    const isNative = typeof AndroidApp !== "undefined" && Boolean(AndroidApp.openOAuth);
    const redirectTo = getAuthRedirectUrl();
    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: isNative }
    });
    if (error) throw error;
    if (isNative && data?.url) AndroidApp.openOAuth(data.url);
  } catch (error) {
    showLoginError(error?.message || `${provider} sign-in is not configured.`);
  }
}

async function onNativeOAuthCallback(callbackUrl) {
  try {
    const client = getSupabaseClient();
    const url = new URL(callbackUrl);
    const params = new URLSearchParams(url.hash.replace(/^#/, "") || url.search);
    const code = params.get("code");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    let result;
    if (code) result = await client.auth.exchangeCodeForSession(code);
    else if (accessToken && refreshToken) {
      result = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    } else {
      throw new Error(params.get("error_description") || "Social sign-in was cancelled.");
    }
    if (result.error) throw result.error;
    const profile = await loadOrCreateAuthProfile(result.data.user);
    finishSupabaseLogin(profile);
  } catch (error) {
    showLoginError(error?.message || "Could not complete social sign-in.");
  }
}

function finishSupabaseLogin(profile) {
  setAuthSession(profile);
  isAuthenticated = true;
  authenticatedUser = profile.username;
  completeLogin(profile.username);
}

function loginAsBypass(username) {
  console.log("DuoGym: Bypass login initiated for", username);
  const profile = {
    id: username === "aman" ? "aman-bypass-uuid" : "rishit-bypass-uuid",
    username: username,
    display_name: username === "aman" ? "Aman" : "Rishit",
    rival_username: username === "aman" ? "rishit" : "aman"
  };
  setAuthSession(profile);
  isAuthenticated = true;
  authenticatedUser = username;
  completeLogin(username);
}

function completeLogin(username) {
  DOM.get("login-overlay")?.classList.add("hidden");
  const appLayout = DOM.get("app-layout");
  if (appLayout) appLayout.style.display = "";
  currentUser = username;
  loadData();
  ensureUserData(username);
  const today = dateToYYYYMMDD(new Date());
  selectedDate = isWithinSubscription(today) ? today : START_DATE_STR;
  updateLoggedInHeader(username);
  switchUser(username);
  if (activePage !== "today") switchPage("today");
  else updatePageContent();
  initDietData();
  initSupabaseSync(username);
}

function updateLoggedInHeader(username) {
  const badge = DOM.get("header-logged-user");
  if (badge) {
    badge.textContent = authenticatedProfile?.display_name || username;
    badge.style.display = "inline-block";
    badge.style.color = "#00ff88";
    badge.style.background = "rgba(0,255,136,.1)";
  }
  const logout = DOM.get("header-logout-btn");
  if (logout) logout.style.display = "flex";
}

async function handleLogout() {
  if (!confirm("Log out of FitRivals?")) return;
  try {
    if (supabaseClient) await supabaseClient.auth.signOut();
  } catch (_) {}
  if (typeof stopChatPolling === 'function') {
    stopChatPolling();
  }
  clearAuthSession();
  isAuthenticated = false;
  authenticatedUser = null;
  authenticatedProfile = null;
  DOM.get("header-logged-user")?.style.setProperty("display", "none");
  DOM.get("login-overlay")?.classList.remove("hidden");
  const appLayout = DOM.get("app-layout");
  if (appLayout) appLayout.style.display = "none";
  const password = DOM.get("login-password");
  if (password) password.value = "";
  setAuthMode("signin");
}

function initSupabaseSync(username) {
  if (typeof supabase === 'undefined') {
    console.log('DuoGym: Supabase SDK not loaded — running in offline mode');
    updateSyncBadge('offline');
    return;
  }

  const storedUrl = safeStorage.getItem("duogym_supabase_url");
  const storedKey = safeStorage.getItem("duogym_supabase_key");
  
  let activeUrl = storedUrl || SUPABASE_URL;
  let activeKey = storedKey || SUPABASE_ANON_KEY;
  
  if (!activeUrl || activeUrl.includes("your-supabase-url") || !activeKey || activeKey.includes("your-anon-key")) {
    console.log('DuoGym: Supabase credentials not set — running in offline mode');
    updateSyncBadge('offline');
    return;
  }

  try {
    supabaseClient = getSupabaseClient() || supabase.createClient(activeUrl, activeKey);
    supabaseInitialized = true;
    
    // Pull latest data from Supabase
    syncFromSupabase(username);
    
    // Enable realtime sync for both user and rival updates
    enableSupabaseRealtime(username);
    
    // Initialize real-time chat channel
    if (typeof initChatRealtime === 'function') {
      initChatRealtime();
    }
    
    // Initial fetch of messages
    if (typeof fetchChatMessages === 'function') {
      fetchChatMessages();
    }
    
    // Start background chat message polling (fallback) - 5s for fast notifications
    if (typeof startChatPolling === 'function') {
      startChatPolling(5000); // 5 seconds for fast notification delivery
    }
    
    console.log('DuoGym: Supabase sync initialized for', username);
    updateSyncBadge('synced');
    
  } catch (e) {
    console.warn('DuoGym: Supabase init failed', e);
    updateSyncBadge('offline');
  }
}

async function syncToSupabase(username) {
  if (!supabaseInitialized || !supabaseClient || !username) return;
  
  updateSyncBadge('syncing');
  
  try {
    console.log('DuoGym: Initiating relational sync to cloud for', username);
    
    // 1. Sync workouts
    const workouts = fitnessData[username]?.workouts || {};
    const workoutRows = Object.keys(workouts).map(dateStr => {
      const w = workouts[dateStr];
      return {
        username,
        workout_date: dateStr,
        completed_exercises: w.completedExercises || [],
        water_intake: w.waterIntake || 0,
        updated_at: new Date().toISOString()
      };
    });
    if (workoutRows.length > 0) {
      const { error } = await supabaseClient.from('duogym_workouts').upsert(workoutRows);
      if (error) throw error;
    }
    
    // 2. Sync weights
    const weights = fitnessData[username]?.weights || {};
    const weightRows = Object.keys(weights).map(dateStr => ({
      username,
      log_date: dateStr,
      weight: Number(weights[dateStr])
    }));
    if (weightRows.length > 0) {
      const { error } = await supabaseClient.from('duogym_weights').upsert(weightRows);
      if (error) throw error;
    }
    
    // 3. Sync notes
    const notes = fitnessData[username]?.notes || {};
    const noteRows = Object.keys(notes).map(dateStr => ({
      username,
      log_date: dateStr,
      note: notes[dateStr]
    }));
    if (noteRows.length > 0) {
      const { error } = await supabaseClient.from('duogym_notes').upsert(noteRows);
      if (error) throw error;
    }
    
    // 4. Sync badges
    const badges = fitnessData[username]?.badges || [];
    const badgeRows = badges.map(badgeId => ({
      username,
      badge_id: badgeId
    }));
    if (badgeRows.length > 0) {
      const { error } = await supabaseClient.from('duogym_badges').upsert(badgeRows);
      if (error) throw error;
    }
    
    // 5. Sync activity movement
    const movement = fitnessData[username]?.activityData?.movement || {};
    const movementRows = Object.keys(movement).map(dateStr => {
      const m = movement[dateStr];
      return {
        username,
        log_date: dateStr,
        steps: m.steps || 0,
        distance: Number(m.distance) || 0,
        active_minutes: m.activeMinutes || 0,
        floors: m.floors || 0,
        active_calories: m.activeCalories || 0
      };
    });
    if (movementRows.length > 0) {
      const { error } = await supabaseClient.from('duogym_activity_movement').upsert(movementRows);
      if (error) throw error;
    }
    
    // 6. Sync activity sleep
    const sleep = fitnessData[username]?.activityData?.sleep || {};
    const sleepRows = Object.keys(sleep).map(dateStr => {
      const s = sleep[dateStr];
      return {
        username,
        log_date: dateStr,
        bedtime: s.bedtime || '',
        wake_time: s.wakeTime || '',
        quality: s.quality || 0,
        duration: Number(s.duration) || 0,
        score: s.score || 0
      };
    });
    if (sleepRows.length > 0) {
      const { error } = await supabaseClient.from('duogym_activity_sleep').upsert(sleepRows);
      if (error) throw error;
    }
    
    // 7. Sync XP
    const xp = fitnessData[username]?.activityData?.xp || { total: 0, level: 1 };
    const xpRow = {
      username,
      total_xp: xp.total || 0,
      xp_level: xp.level || 1,
      updated_at: new Date().toISOString()
    };
    const { error: xpError } = await supabaseClient.from('duogym_xp').upsert(xpRow);
    if (xpError) throw xpError;
    
    // 8. Sync diet profile
    const diet = getActiveDietData();
    if (diet && diet.profile) {
      const p = diet.profile;
      const profileRow = {
        username,
        age: p.age || 18,
        height: p.height || 170,
        weight: p.weight || 70,
        goal_weight: p.goalWeight || 70,
        target_calories: p.targetCalories || 2000,
        target_protein: p.targetProtein || null,
        target_carbs: p.targetCarbs || null,
        target_fat: p.targetFat || null,
        updated_at: new Date().toISOString()
      };
      const { error: profileError } = await supabaseClient.from('duogym_diet_profile').upsert(profileRow);
      if (profileError) throw profileError;
    }
    
    // 9. Sync diet meals
    const mealRows = [];
    if (diet && diet.meals) {
      Object.keys(diet.meals).forEach(dateStr => {
        const dayMeals = diet.meals[dateStr];
        ["Breakfast", "Lunch", "EveningSnacks", "Dinner"].forEach(type => {
          const items = dayMeals[type] || [];
          items.forEach(food => {
            const macros = getFoodMacros(food);
            mealRows.push({
              username,
              log_date: dateStr,
              meal_type: type,
              food_name: food.n || food.name,
              serving: food.s || '1 serving',
              calories: food.k || 0,
              protein: macros.protein || 0.0,
              carbs: macros.carbs || 0.0,
              fat: macros.fat || 0.0
            });
          });
        });
      });
    }
    await supabaseClient.from('duogym_diet_meals').delete().eq('username', username);
    if (mealRows.length > 0) {
      const { error: mealError } = await supabaseClient.from('duogym_diet_meals').insert(mealRows);
      if (mealError) throw mealError;
    }
    
    // 10. Sync diet schedule template
    const schedRows = [];
    if (diet && diet.schedule) {
      Object.keys(diet.schedule).forEach(day => {
        const dayMeals = diet.schedule[day];
        ["Breakfast", "Lunch", "EveningSnacks", "Dinner"].forEach(type => {
          const items = dayMeals[type] || [];
          items.forEach(food => {
            const macros = getFoodMacros(food);
            schedRows.push({
              username,
              weekday: day,
              meal_type: type,
              food_name: food.n || food.name,
              serving: food.s || '1 serving',
              calories: food.k || 0,
              protein: macros.protein || 0.0,
              carbs: macros.carbs || 0.0,
              fat: macros.fat || 0.0
            });
          });
        });
      });
    }
    await supabaseClient.from('duogym_diet_schedule').delete().eq('username', username);
    if (schedRows.length > 0) {
      const { error: schedError } = await supabaseClient.from('duogym_diet_schedule').insert(schedRows);
      if (schedError) throw schedError;
    }
    
    // 11. Sync custom foods
    const customFoodRows = [];
    if (diet && diet.customFoods) {
      const foods = Array.isArray(diet.customFoods) ? diet.customFoods : Object.values(diet.customFoods || {});
      foods.forEach(food => {
        const macros = getFoodMacros(food);
        customFoodRows.push({
          username,
          food_name: food.n || food.name,
          serving: food.s || '100g',
          calories: food.k || 0,
          protein: macros.protein || 0.0,
          carbs: macros.carbs || 0.0,
          fat: macros.fat || 0.0
        });
      });
    }
    await supabaseClient.from('duogym_custom_foods').delete().eq('username', username);
    if (customFoodRows.length > 0) {
      const { error: customError } = await supabaseClient.from('duogym_custom_foods').insert(customFoodRows);
      if (customError) throw customError;
    }
    
    updateSyncBadge('synced');
    console.log('DuoGym: Relational sync to cloud completed successfully for', username);
    
  } catch (e) {
    console.warn('DuoGym: Supabase relational sync failed', e);
    updateSyncBadge('offline');
  }
}

async function syncFromSupabase(username) {
  if (!supabaseInitialized || !supabaseClient || !username) return;
  
  updateSyncBadge('syncing');
  
  try {
    console.log('DuoGym: Pulling relational data from cloud for', username);
    
    // Fetch all tables in parallel
    const [
      { data: workouts },
      { data: weights },
      { data: notes },
      { data: badges },
      { data: movement },
      { data: sleep },
      { data: xp },
      { data: dietProfile },
      { data: dietMeals },
      { data: dietSchedule },
      { data: customFoods }
    ] = await Promise.all([
      supabaseClient.from('duogym_workouts').select('*').eq('username', username),
      supabaseClient.from('duogym_weights').select('*').eq('username', username),
      supabaseClient.from('duogym_notes').select('*').eq('username', username),
      supabaseClient.from('duogym_badges').select('*').eq('username', username),
      supabaseClient.from('duogym_activity_movement').select('*').eq('username', username),
      supabaseClient.from('duogym_activity_sleep').select('*').eq('username', username),
      supabaseClient.from('duogym_xp').select('*').eq('username', username).maybeSingle(),
      supabaseClient.from('duogym_diet_profile').select('*').eq('username', username).maybeSingle(),
      supabaseClient.from('duogym_diet_meals').select('*').eq('username', username),
      supabaseClient.from('duogym_diet_schedule').select('*').eq('username', username),
      supabaseClient.from('duogym_custom_foods').select('*').eq('username', username)
    ]);
    
    // Initialize user structures
    if (!fitnessData[username]) {
      fitnessData[username] = createEmptyUserData(username);
    }
    
    // 1. Reconstruct Workouts
    if (workouts) {
      workouts.forEach(w => {
        const dateStr = w.workout_date;
        fitnessData[username].workouts[dateStr] = {
          completedExercises: w.completed_exercises || [],
          waterIntake: w.water_intake || 0
        };
      });
    }
    
    // 2. Reconstruct Weights
    if (weights) {
      weights.forEach(w => {
        fitnessData[username].weights[w.log_date] = Number(w.weight);
      });
    }
    
    // 3. Reconstruct Notes
    if (notes) {
      notes.forEach(n => {
        fitnessData[username].notes[n.log_date] = n.note;
      });
    }
    
    // 4. Reconstruct Badges
    if (badges) {
      fitnessData[username].badges = badges.map(b => b.badge_id);
    }
    
    // 5. Reconstruct Activity Movement
    if (movement) {
      movement.forEach(m => {
        fitnessData[username].activityData.movement[m.log_date] = {
          steps: m.steps,
          distance: Number(m.distance),
          activeMinutes: m.active_minutes,
          floors: m.floors,
          activeCalories: m.active_calories
        };
      });
    }
    
    // 6. Reconstruct Activity Sleep
    if (sleep) {
      sleep.forEach(s => {
        fitnessData[username].activityData.sleep[s.log_date] = {
          bedtime: s.bedtime,
          wakeTime: s.wake_time,
          quality: s.quality,
          duration: Number(s.duration),
          score: s.score
        };
      });
    }
    
    // 7. Reconstruct XP
    if (xp) {
      fitnessData[username].activityData.xp.total = xp.total_xp;
      fitnessData[username].activityData.xp.level = xp.xp_level;
    }
    
    // 8. Reconstruct Diet Data
    const diet = {
      profile: dietProfile ? {
        age: dietProfile.age,
        height: Number(dietProfile.height),
        weight: Number(dietProfile.weight),
        goalWeight: Number(dietProfile.goal_weight),
        targetCalories: dietProfile.target_calories,
        targetProtein: dietProfile.target_protein,
        targetCarbs: dietProfile.target_carbs,
        targetFat: dietProfile.target_fat
      } : { age: 24, height: 170, weight: 94.6, goalWeight: 80, targetCalories: 2200 },
      meals: {},
      schedule: {
        Monday: { Breakfast: [], Lunch: [], EveningSnacks: [], Dinner: [] },
        Tuesday: { Breakfast: [], Lunch: [], EveningSnacks: [], Dinner: [] },
        Wednesday: { Breakfast: [], Lunch: [], EveningSnacks: [], Dinner: [] },
        Thursday: { Breakfast: [], Lunch: [], EveningSnacks: [], Dinner: [] },
        Friday: { Breakfast: [], Lunch: [], EveningSnacks: [], Dinner: [] },
        Saturday: { Breakfast: [], Lunch: [], EveningSnacks: [], Dinner: [] },
        Sunday: { Breakfast: [], Lunch: [], EveningSnacks: [], Dinner: [] }
      },
      customFoods: []
    };
    
    // 9. Reconstruct Diet Meals
    if (dietMeals) {
      dietMeals.forEach(m => {
        const dateStr = m.log_date;
        if (!diet.meals[dateStr]) {
          diet.meals[dateStr] = { Breakfast: [], Lunch: [], EveningSnacks: [], Dinner: [] };
        }
        diet.meals[dateStr][m.meal_type].push({
          n: m.food_name,
          s: m.serving,
          k: m.calories,
          p: m.protein,
          c: m.carbs,
          f: m.fat
        });
      });
    }
    
    // 10. Reconstruct Diet Schedule Template
    if (dietSchedule) {
      dietSchedule.forEach(s => {
        diet.schedule[s.weekday][s.meal_type].push({
          n: s.food_name,
          s: s.serving,
          k: s.calories,
          p: s.protein,
          c: s.carbs,
          f: s.fat
        });
      });
    }
    
    // 11. Reconstruct Custom Foods
    if (customFoods) {
      customFoods.forEach(cf => {
        diet.customFoods.push({
          n: cf.food_name,
          s: cf.serving,
          k: cf.calories,
          p: cf.protein,
          c: cf.carbs,
          f: cf.fat
        });
      });
    }
    
    // Commit back to local storage
    saveData(false);
    if (typeof saveDietDataDirect === 'function') {
      saveDietDataDirect(username, diet);
    }
    
    console.log('DuoGym: Relational pull completed and synced locally for', username);
    updatePageContent();
    updateSyncBadge('synced');
    
  } catch (e) {
    console.warn('DuoGym: Pull relational from Supabase failed', e);
    updateSyncBadge('offline');
  }
}

async function registerDeviceToken(username, token) {
  if (!supabaseInitialized || !supabaseClient || !username || !token) return;
  try {
    await supabaseClient.from('duogym_device_tokens').upsert({
      username,
      device_token: token,
      updated_at: new Date().toISOString()
    });
    console.log('DuoGym: Device token registered successfully in cloud.');
  } catch (e) {
    console.warn('DuoGym: Failed to register device token', e);
  }
}

function askAICoachRichards() {
  const modal = DOM.get("ai-coach-modal");
  const input = DOM.get("ai-coach-query-input");
  if (!modal || !input) return;
  input.value = "";
  modal.style.display = "flex";
  setTimeout(() => input.focus(), 100);
}

function closeAICoachModal() {
  const modal = DOM.get("ai-coach-modal");
  if (modal) modal.style.display = "none";
}

async function submitAICoachQuery() {
  const modal = DOM.get("ai-coach-modal");
  const input = DOM.get("ai-coach-query-input");
  const btn = DOM.get("ask-ai-coach-btn");
  const textEl = DOM.get("coach-feedback-text");
  
  if (!modal || !input || !btn || !textEl || !supabaseInitialized || !supabaseClient) return;
  
  const userMsg = input.value.trim();
  modal.style.display = "none";
  
  const originalBtnText = btn.innerHTML;
  btn.disabled = true;
  btn.innerText = "Analyzing...";
  
  ensureDateRecord(currentUser, selectedDate);
  const record = fitnessData[currentUser].workouts[selectedDate];
  const workout = getWorkoutForDate(selectedDate);
  const dietData = getActiveDietData();
  
  const statsContext = {
    username: currentUser,
    date: selectedDate,
    workoutFocus: workout.focus,
    workoutType: workout.type,
    exercisesCompleted: record.completedExercises.length,
    totalExercises: workout.exercises.length,
    waterIntake: record.waterIntake,
    diet: getDietDateAggregates ? getDietDateAggregates(dietData, currentUser, selectedDate) : {}
  };
  
  try {
    const { data, error } = await supabaseClient.functions.invoke('ai-coach', {
      body: { message: userMsg || "Please analyze my stats for today and give me feedback.", statsContext }
    });
    
    if (error) throw error;
    if (data && data.reply) {
      textEl.innerHTML = `<div style="border-left: 2px solid var(--accent); padding-left: 8px; margin-bottom: 8px; font-weight: 600; color: var(--accent);">AI Coach Richards:</div>${data.reply}`;
    }
  } catch (e) {
    console.warn("AI Coach failed:", e);
    alert("Could not reach Coach Richards. Keep pushing!");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalBtnText;
  }
}

function mergeUserData(local, cloud) {
  if (!local) return cloud || {};
  if (!cloud) return local;
  
  const merged = JSON.parse(JSON.stringify(local));
  
  // Merge workouts
  if (cloud.workouts) {
    if (!merged.workouts) merged.workouts = {};
    Object.keys(cloud.workouts).forEach(date => {
      const localWorkout = merged.workouts[date];
      const cloudWorkout = cloud.workouts[date];
      if (!localWorkout) {
        merged.workouts[date] = cloudWorkout;
      } else {
        const localEmpty = (!localWorkout.completedExercises || localWorkout.completedExercises.length === 0) &&
                           (!localWorkout.skippedExercises || localWorkout.skippedExercises.length === 0);
        const cloudNotEmpty = (cloudWorkout.completedExercises && cloudWorkout.completedExercises.length > 0) ||
                             (cloudWorkout.skippedExercises && cloudWorkout.skippedExercises.length > 0);
        if (localEmpty && cloudNotEmpty) {
          merged.workouts[date] = cloudWorkout;
        } else if (cloudWorkout.completedExercises || cloudWorkout.skippedExercises) {
          const completedSet = new Set([...(localWorkout.completedExercises || []), ...(cloudWorkout.completedExercises || [])]);
          const skippedSet = new Set([...(localWorkout.skippedExercises || []), ...(cloudWorkout.skippedExercises || [])]);
          merged.workouts[date] = {
            ...localWorkout,
            completedExercises: Array.from(completedSet),
            skippedExercises: Array.from(skippedSet)
          };
        }
      }
    });
  }
  
  // Merge weights
  if (cloud.weights) {
    if (!merged.weights) merged.weights = {};
    Object.assign(merged.weights, cloud.weights);
  }
  
  // Merge meals
  if (cloud.meals) {
    if (!merged.meals) merged.meals = {};
    Object.keys(cloud.meals).forEach(date => {
      const localMeal = merged.meals[date];
      const cloudMeal = cloud.meals[date];
      if (!localMeal) {
        merged.meals[date] = cloudMeal;
      } else {
        const mealTypes = ["Breakfast", "Lunch", "EveningSnacks", "Dinner"];
        mealTypes.forEach(type => {
          const localItems = localMeal[type] || [];
          const cloudItems = cloudMeal[type] || [];
          const combined = [...localItems];
          cloudItems.forEach(cItem => {
            if (!combined.some(lItem => lItem.id === cItem.id || lItem.name === cItem.name)) {
              combined.push(cItem);
            }
          });
          localMeal[type] = combined;
        });
      }
    });
  }

  // Merge activityData
  if (cloud.activityData) {
    merged.activityData = mergeActivityData(merged.activityData, cloud.activityData);
  }
  
  // Merge diet profile
  if (cloud.profile) {
    if (!merged.profile) merged.profile = {};
    Object.assign(merged.profile, cloud.profile);
  }
  
  // Merge diet schedule
  if (cloud.schedule) {
    merged.schedule = cloud.schedule;
  }
  
  return merged;
}

function mergeActivityData(localAct, cloudAct) {
  if (!localAct) return cloudAct || {};
  if (!cloudAct) return localAct;
  const merged = JSON.parse(JSON.stringify(localAct));
  const newestRecord = (localRecord, cloudRecord) => {
    if (!localRecord) return cloudRecord;
    if (!cloudRecord) return localRecord;
    const localTime = Date.parse(localRecord.updatedAt || localRecord.syncedAt || 0) || 0;
    const cloudTime = Date.parse(cloudRecord.updatedAt || cloudRecord.syncedAt || 0) || 0;
    if (localTime === cloudTime) {
      if (localRecord.source === "health_connect") return localRecord;
      if (cloudRecord.source === "health_connect") return cloudRecord;
    }
    return cloudTime > localTime ? cloudRecord : localRecord;
  };

  // Merge movement
  if (cloudAct.movement) {
    if (!merged.movement) merged.movement = {};
    Object.keys(cloudAct.movement).forEach(d => {
      merged.movement[d] = newestRecord(merged.movement[d], cloudAct.movement[d]);
    });
  }
  // Merge sleep
  if (cloudAct.sleep) {
    if (!merged.sleep) merged.sleep = {};
    Object.keys(cloudAct.sleep).forEach(d => {
      merged.sleep[d] = newestRecord(merged.sleep[d], cloudAct.sleep[d]);
    });
  }
  // Merge body
  if (cloudAct.body) {
    if (!merged.body) merged.body = {};
    Object.keys(cloudAct.body).forEach(d => {
      merged.body[d] = newestRecord(merged.body[d], cloudAct.body[d]);
    });
  }
  // Merge XP (take highest)
  if (cloudAct.xp && (!merged.xp || (cloudAct.xp.total || 0) > (merged.xp.total || 0))) {
    merged.xp = cloudAct.xp;
  }
  // Merge feed
  if (cloudAct.feed) {
    if (!merged.feed) merged.feed = [];
    cloudAct.feed.forEach(item => {
      if (!merged.feed.some(fi => fi.id === item.id)) {
        merged.feed.push(item);
      }
    });
    // Sort feed by timestamp desc, limit to 50
    merged.feed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    merged.feed = merged.feed.slice(0, 50);
  }
  // Merge races, streaks, challenges, insights
  if (cloudAct.races) {
    if (!merged.races || (cloudAct.races.history && cloudAct.races.history.length > (merged.races.history ? merged.races.history.length : 0))) {
      merged.races = cloudAct.races;
    }
  }
  merged.xpEvents = { ...(cloudAct.xpEvents || {}), ...(merged.xpEvents || {}) };
  merged.challenges = {
    ...(cloudAct.challenges || {}),
    ...(merged.challenges || {}),
    daily: { ...((cloudAct.challenges || {}).daily || {}), ...((merged.challenges || {}).daily || {}) },
    weekly: { ...((cloudAct.challenges || {}).weekly || {}), ...((merged.challenges || {}).weekly || {}) }
  };
  if (!merged.goals && cloudAct.goals) merged.goals = cloudAct.goals;
  return merged;
}

function enableSupabaseRealtime(username) {
  if (!supabaseInitialized || !supabaseClient || !username) return;
  
  if (supabaseRealtimeChannel) {
    supabaseClient.removeChannel(supabaseRealtimeChannel);
  }
  if (supabaseRivalRealtimeChannel) {
    supabaseClient.removeChannel(supabaseRivalRealtimeChannel);
  }
  
  const rival = typeof getRivalUsername === 'function' ? getRivalUsername() : null;
  console.log('DuoGym: Initializing realtime channels for', username, 'and rival', rival);
  
  // 1. Listen to own changes (if updated from another of the user's devices)
  supabaseRealtimeChannel = supabaseClient
    .channel('public:duogym_users_data:username=' + username)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'duogym_users_data',
      filter: 'username=eq.' + username
    }, payload => {
      console.log('DuoGym: Realtime update received from Supabase for', username);
      const newData = payload.new;
      if (newData) {
        let changed = false;
        if (newData.fitness_data) {
          fitnessData[username] = mergeUserData(fitnessData[username], newData.fitness_data);
          changed = true;
        }
        if (newData.diet_data) {
          const localDiet = getActiveDietData ? getActiveDietData() : {};
          const mergedDiet = mergeUserData(localDiet, newData.diet_data);
          if (typeof saveDietDataDirect === 'function') {
            saveDietDataDirect(username, mergedDiet);
          }
          changed = true;
        }
        if (changed) {
          saveData();
          updatePageContent();
        }
      }
    })
    .subscribe();

  // 2. Listen to rival's changes (so workouts/posts update in realtime)
  if (rival) {
    supabaseRivalRealtimeChannel = supabaseClient
      .channel('public:duogym_users_data:username=' + rival)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'duogym_users_data',
        filter: 'username=eq.' + rival
      }, payload => {
        console.log('DuoGym: Realtime update received from Supabase for rival', rival);
        const newData = payload.new;
        if (newData && newData.fitness_data) {
          fitnessData[rival] = mergeUserData(fitnessData[rival], newData.fitness_data);
          saveData(false); // Do not sync back to cloud since this is rival's data
          updatePageContent();
        }
      })
      .subscribe();
  }
}

// Debounced sync — called after every saveData()
function debouncedSync() {
  if (!supabaseInitialized) return;
  
  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    if (authenticatedUser) {
      syncToSupabase(authenticatedUser);
    }
  }, 2000); // 2 seconds debounce is highly responsive and safe
}

function updateSyncBadge(status) {
  syncStatus = status;
  const badge = DOM.get('sync-badge');
  const text = DOM.get('sync-text');
  if (!badge) return;
  
  badge.className = 'sync-badge ' + status;
  if (text) {
    switch(status) {
      case 'synced': text.textContent = 'Synced'; break;
      case 'syncing': text.textContent = 'Syncing...'; break;
      case 'offline': text.textContent = 'Local'; break;
    }
  }
}

// Listen for online/offline and visibility events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (authenticatedUser && supabaseInitialized) {
      syncToSupabase(authenticatedUser);
    }
  });
  
  window.addEventListener('offline', () => {
    updateSyncBadge('offline');
  });

  // Force sync immediately when minimizing/leaving page to avoid data loss on mobile
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && authenticatedUser && supabaseInitialized) {
        clearTimeout(syncDebounceTimer);
        syncToSupabase(authenticatedUser);
      } else if (document.visibilityState === 'visible') {
        if (typeof fetchChatMessages === 'function') {
          fetchChatMessages();
        }
      }
    });
  }
}

/* ============================================================
   DuoGym Tracker — Core Application Script
   ============================================================
   This file manages the state, storage, and UI rendering for 
   Aman and Rishit's personal gym tracking website.
   ============================================================ */

console.log("DuoGym: script.js starting execution...");

/* ============================================================
   1. HOW TO EDIT / EXTEND THIS SCRIPT
   ============================================================
   • TO ADD A NEW EXERCISE:
     Add a new object inside `exerciseLibrary` with a unique `id`.
     Follow this structure:
     {
       id: "new-exercise-id",
       name: "Exercise Name",
       muscles: ["Muscle group 1", "Muscle group 2"],
       image: "Unsplash image URL",
       description: "Brief beginner summary",
       steps: ["Step 1", "Step 2"],
       mistakes: ["Common mistake 1", "Common mistake 2"],
       breathing: "Breathing cue",
       tips: ["Tip 1", "Tip 2"],
       restTime: "Rest duration"
     }

   • TO MODIFY THE WEEKLY WORKOUT PLAN:
     Locate `weeklySchedule` (Section 3). Modify the `type`, `focus`,
     or elements inside `exercises`. The `exerciseId` field must match
     the corresponding `id` in the `exerciseLibrary`.

   • TO EXTEND THE SUBSCRIPTION PERIOD:
     Change the constants `START_DATE_STR` and `END_DATE_STR`
     in Section 4. The calendar will automatically adjust to
     generate and display months between these new dates.

   • TO ADD A NEW USER IN THE FUTURE:
     1. Add the user key to the default initialization object in `initData()`.
     2. Update the HTML `.user-tabs` container with a new button calling
         `switchUser('username')`. */
const exerciseInstructions = {
  "warm-up": {
    name: "Warm-Up Routine",
    youtubeId: "H37Hn-N9kXs",
    category: "mobility",
    steps: [
      "Light treadmill walking or cycling for 5 minutes.",
      "Dynamic stretches: arm circles, leg swings, hip openers.",
      "Keep movement light to warm joints and raise heart rate."
    ],
    tips: "Do not perform static stretching before lifting; keep movements dynamic."
  },
  "push-ups": {
    name: "Push-ups",
    youtubeId: "IODxDxX7oi4",
    category: "chest",
    steps: [
      "Start in a plank position with hands slightly wider than shoulders.",
      "Lower chest towards the floor, keeping elbows at a 45-degree angle.",
      "Push straight back up to full extension."
    ],
    tips: "Ensure core and glutes are fully engaged. Don't let hips sag."
  },
  "db-bench-press": {
    name: "Dumbbell Bench Press",
    youtubeId: "N2BpH92fIkQ",
    category: "chest",
    steps: [
      "Lie flat on bench, hold dumbbells at chest level.",
      "Press dumbbells straight up, keeping wrists aligned.",
      "Lower dumbbells slowly until elbows are just past 90 degrees."
    ],
    tips: "Squeeze shoulder blades together and keep feet flat on the floor."
  },
  "incline-db-press": {
    name: "Incline Dumbbell Press",
    youtubeId: "8iPupt5ECgY",
    category: "chest",
    steps: [
      "Set bench to 30-45 degrees, lie back with dumbbells.",
      "Press dumbbells straight up above upper chest.",
      "Lower the weights slowly to shoulder level."
    ],
    tips: "Focus on upper chest contraction. Avoid flaring elbows out."
  },
  "chest-fly": {
    name: "Chest Fly",
    youtubeId: "eGjt4lk6g34",
    category: "chest",
    steps: [
      "Lie on flat bench, dumbbells extended above chest.",
      "Lower weights out to the sides in a wide arc.",
      "Squeeze chest to return weights back to center."
    ],
    tips: "Keep a slight, static bend in your elbows. Stretch, don't press."
  },
  "tricep-pushdown": {
    name: "Tricep Pushdown",
    youtubeId: "2-LAMgAqyWY",
    category: "arms",
    steps: [
      "Stand facing cable, grab attachment with overhand grip.",
      "Push cable down extending arms fully.",
      "Slowly return to start, flexing elbow to 90 degrees."
    ],
    tips: "Keep elbows pinned to your ribs throughout the movement."
  },
  "overhead-tricep-ext": {
    name: "Overhead Dumbbell Tricep Extension",
    youtubeId: "-Vyt2Qg89yI",
    category: "arms",
    steps: [
      "Hold dumbbell overhead with both hands.",
      "Lower the weight behind head by bending elbows.",
      "Extend elbows to press dumbbells back overhead."
    ],
    tips: "Keep elbows close to head and pointing forward, not flared out."
  },
  "incline-walk": {
    name: "Incline Treadmill Walk",
    youtubeId: "6i3P14mF2J0",
    category: "cardio",
    steps: [
      "Set treadmill incline to 5-10%.",
      "Walk at a steady, brisk pace (3.0-3.5 mph).",
      "Pump arms naturally to support breathing."
    ],
    tips: "Avoid holding onto handrails; let your core and legs support you."
  },
  "cool-down": {
    name: "Cool-Down Routine",
    youtubeId: "u5Hr3rI1484",
    category: "mobility",
    steps: [
      "Perform gentle static stretches for chest, back, and hamstrings.",
      "Hold each stretch for 20-30 seconds without bouncing.",
      "Focus on slow deep breathing to lower heart rate."
    ],
    tips: "Static stretching is perfect here to improve flexibility and recovery."
  },
  "lat-pulldown": {
    name: "Lat Pulldown",
    youtubeId: "CAwf7n6Luuc",
    category: "back",
    steps: [
      "Grip pulldown bar wider than shoulder-width.",
      "Pull bar down to upper chest, leading with elbows.",
      "Slowly return bar back to start with control."
    ],
    tips: "Pull from your elbows, squeeze shoulder blades down and back."
  },
  "db-row": {
    name: "One-Arm Dumbbell Row",
    youtubeId: "dFzUjzs43IE",
    category: "back",
    steps: [
      "Place one knee and hand on flat bench, hold dumbbell in other hand.",
      "Pull dumbbell up to hip level, leading with elbow.",
      "Lower dumbbell straight down under control."
    ],
    tips: "Keep back flat and neck neutral. Pull towards your hip, not chest."
  },
  "seated-row": {
    name: "Seated Cable Row",
    youtubeId: "GZbfZ033f74",
    category: "back",
    steps: [
      "Sit at rowing station, grip handle attachment.",
      "Pull attachment to lower stomach, keeping spine straight.",
      "Slowly return arms back to straight start position."
    ],
    tips: "Squeeze shoulder blades at contraction; do not use torso momentum."
  },
  "face-pulls": {
    name: "Face Pulls",
    youtubeId: "V8dZ33wNgao",
    category: "shoulders",
    steps: [
      "Grip rope attachment at chest height, step back.",
      "Pull rope towards forehead, separating hands.",
      "Hold briefly, feeling contraction in upper back."
    ],
    tips: "Keep chest up and elbows flared high. Great for rear delts and posture."
  },
  "rear-delt-fly": {
    name: "Rear Delt Fly",
    youtubeId: "5yWaS1kkdj4",
    category: "shoulders",
    steps: [
      "Sit on edge of bench, hinge forward from hips.",
      "Raise dumbbells out to sides, keeping slight elbow bend.",
      "Lower weights back down slowly."
    ],
    tips: "Focus on upper back contraction. Avoid using momentum."
  },
  "db-curl": {
    name: "Dumbbell Curl",
    youtubeId: "ykJgrb5KY5E",
    category: "arms",
    steps: [
      "Hold dumbbells at sides, palms facing in.",
      "Curl weights up while rotating palms to face forward.",
      "Lower dumbbells back to sides with control."
    ],
    tips: "Keep elbows locked close to your sides throughout the curl."
  },
  "hammer-curl": {
    name: "Hammer Curl",
    youtubeId: "zC3nLlEvin4",
    category: "arms",
    steps: [
      "Hold dumbbells at sides with palms facing in.",
      "Curl weights up, keeping palms facing in (neutral grip).",
      "Lower dumbbells back down slowly."
    ],
    tips: "Keep wrists straight and do not swing the body."
  },
  "walking-cycling": {
    name: "Brisk Walk or Cycling",
    youtubeId: "xR7_aLdbd28",
    category: "cardio",
    steps: [
      "Walk briskly outdoors/treadmill or cycle at moderate pace.",
      "Maintain active recovery breathing."
    ],
    tips: "Recovery-focused cardio. Keep effort level moderate."
  },
  "goblet-squat": {
    name: "Goblet Squat",
    youtubeId: "MeIiYIFkP-Y",
    category: "legs",
    steps: [
      "Hold dumbbell vertically against chest.",
      "Squat down until thighs are parallel to floor.",
      "Push through heels to return to standing position."
    ],
    tips: "Keep your chest up and weight on your heels. Avoid knee valgus."
  },
  "leg-press": {
    name: "Leg Press",
    youtubeId: "CHjGj7V9E8o",
    category: "legs",
    steps: [
      "Sit in machine, place feet shoulder-width on platform.",
      "Lower platform until knees are bent to 90 degrees.",
      "Push platform away extending legs."
    ],
    tips: "Do not lock out your knees at the top. Keep feet flat."
  },
  "walking-lunges": {
    name: "Walking Lunges",
    youtubeId: "D7KaRcUTQeE",
    category: "legs",
    steps: [
      "Step forward and lower hips until back knee is near floor.",
      "Drive through front heel to step forward into next lunge.",
      "Alternate legs continuously."
    ],
    tips: "Keep front knee tracked over ankle. Maintain upright posture."
  },
  "romanian-deadlift": {
    name: "Romanian Deadlift",
    youtubeId: "JCXUYuzw41M",
    category: "legs",
    steps: [
      "Stand holding weights in front of thighs.",
      "Hinge hips back, lowering weights down along shins.",
      "Squeeze glutes and hamstrings to return to upright."
    ],
    tips: "Keep back flat and neck neutral. Hinge hips, do not squat."
  },
  "leg-curl": {
    name: "Leg Curl",
    youtubeId: "1Tq3QdIUhyA",
    category: "legs",
    steps: [
      "Position roller pad behind ankles.",
      "Curl heels towards glutes contracting hamstrings.",
      "Slowly return pad back to starting position."
    ],
    tips: "Keep hips pressed flat against the pad. Control the eccentric phase."
  },
  "calf-raise": {
    name: "Calf Raises",
    youtubeId: "YMmgq748q2M",
    category: "legs",
    steps: [
      "Stand on edge of platform on balls of feet.",
      "Raise up on toes as high as possible.",
      "Lower heels down below platform level."
    ],
    tips: "Hold the bottom stretch for 1 second and the top squeeze for 1 second."
  },
  "plank": {
    name: "Plank",
    youtubeId: "pSHjTRCQxIw",
    category: "core",
    steps: [
      "Rest forearms on floor, extend legs behind.",
      "Hold body in a straight line parallel to floor.",
      "Engage core and hold position."
    ],
    tips: "Breathe continuously. Squeeze glutes and core to protect lower back."
  },
  "leg-raises": {
    name: "Leg Raises",
    youtubeId: "JB2oyawG9KI",
    category: "core",
    steps: [
      "Lie on back, hands under glutes.",
      "Raise legs straight up until vertical.",
      "Lower legs back down slowly, keeping back flat."
    ],
    tips: "Do not let lower back arch off the floor as you lower legs."
  },
  "db-shoulder-press": {
    name: "Dumbbell Shoulder Press",
    youtubeId: "HzIiNhHhhtA",
    category: "shoulders",
    steps: [
      "Hold dumbbells at shoulder level, elbows bent.",
      "Press weights straight up overhead.",
      "Lower dumbbells back to shoulders under control."
    ],
    tips: "Keep wrists stacked directly over elbows. Engage core."
  },
  "lateral-raises": {
    name: "Lateral Raises",
    youtubeId: "3VcKaXpzqRo",
    category: "shoulders",
    steps: [
      "Hold dumbbells at sides.",
      "Raise arms out to sides with a slight elbow bend.",
      "Lower dumbbells back to sides slowly."
    ],
    tips: "Lead with elbows. Tilt weights slightly forward at top."
  },
  "front-raises": {
    name: "Front Raises",
    youtubeId: "hRJ61wODPD0",
    category: "shoulders",
    steps: [
      "Hold dumbbells in front of thighs.",
      "Raise weights straight forward to shoulder height.",
      "Lower back down slowly."
    ],
    tips: "Minimize body swing. Control the movement."
  },
  "upright-row": {
    name: "Upright Row",
    youtubeId: "amIU-laDuo8",
    category: "shoulders",
    steps: [
      "Hold weights in front of thighs.",
      "Pull weights up to chest level, leading with elbows.",
      "Lower weights back down slowly."
    ],
    tips: "Keep weights close to body. Keep elbows higher than wrists."
  },
  "shrugs": {
    name: "Shrugs",
    youtubeId: "g6qbq4Lf1FI",
    category: "shoulders",
    steps: [
      "Hold dumbbells at sides.",
      "Elevate shoulders straight up towards ears.",
      "Hold briefly, then lower slowly."
    ],
    tips: "Do not roll your shoulders. Move straight up and down."
  },
  "dead-bug": {
    name: "Dead Bug",
    youtubeId: "4XOFhyWrOoY",
    category: "core",
    steps: [
      "Lie on back, arms pointing up, knees bent at 90 degrees.",
      "Lower opposite arm and leg toward floor slowly.",
      "Return to start, then repeat on opposite side."
    ],
    tips: "Press lower back flat against floor. Do not let lower back arch."
  },
  "side-plank": {
    name: "Side Plank",
    youtubeId: "TpxjnvJ05p4",
    category: "core",
    steps: [
      "Lie on side, prop torso on elbow.",
      "Raise hips until body is straight.",
      "Hold position while breathing steadily."
    ],
    tips: "Keep elbow directly under shoulder. Hips stacked and high."
  },
  "squat-variation": {
    name: "Squat Variation",
    youtubeId: "MVMNk0HiTMg",
    category: "legs",
    steps: [
      "Stand with feet shoulder-width.",
      "Lower hips back and down like sitting in a chair.",
      "Drive through heels to stand back up."
    ],
    tips: "Keep chest up and knees aligned with toes."
  },
  "hip-thrust": {
    name: "Hip Thrust",
    youtubeId: "SEdqd1n01iw",
    category: "legs",
    steps: [
      "Upper back on bench, barbell or weight on hips.",
      "Drive through heels to raise hips flat.",
      "Lower hips down under control."
    ],
    tips: "Tuck chin, squeeze glutes at the top."
  },
  "leg-extension": {
    name: "Leg Extension",
    youtubeId: "m0O_nU0bDE4",
    category: "legs",
    steps: [
      "Position ankles behind roller pad.",
      "Extend legs straight out, contracting thighs.",
      "Lower pad slowly back to start."
    ],
    tips: "Squeeze quads at top. Maintain flat back on seat."
  },
  "rope-tricep-pushdown": {
    name: "Rope Tricep Pushdown",
    youtubeId: "vB5OHsJ3EME",
    category: "arms",
    steps: [
      "Hold rope ends, elbows locked at sides.",
      "Push down, separating rope ends at bottom.",
      "Return slowly to start."
    ],
    tips: "Flex triceps hard at bottom lock-out."
  },
  "cycling-treadmill": {
    name: "Cycling or Incline treadmill",
    youtubeId: "fSg127kY8uA",
    category: "cardio",
    steps: [
      "Cycle at moderate resistance or walk on incline.",
      "Maintain active recovery heart rate."
    ],
    tips: "A good aerobic burn session to wrap up."
  },
  "walking": {
    name: "Recovery Walk",
    youtubeId: "Q4Mcr2uOuxI",
    category: "cardio",
    steps: [
      "Walk at comfortable pace outdoors or on treadmill.",
      "Support blood flow and active recovery."
    ],
    tips: "Low intensity walk to enhance recovery."
  },
  "light-stretching": {
    name: "Light stretching",
    youtubeId: "u5Hr3rI1484",
    category: "mobility",
    steps: [
      "Static stretches focusing on major muscles.",
      "Do not stretch to the point of pain."
    ],
    tips: "Perfect for flexibility and relaxation."
  },
  "mobility-work": {
    name: "Mobility work",
    youtubeId: "H37Hn-N9kXs",
    category: "mobility",
    steps: [
      "Dynamic movements: hip openers, cat-cow, thoracic twists.",
      "Work through active joint ranges of motion."
    ],
    tips: "Improves joint health and ease of movement."
  },
  "barbell-squat": {
    name: "Barbell Back Squat",
    youtubeId: "MVMNk0HiTMg",
    category: "legs",
    steps: [
      "Rest barbell on upper traps, feet shoulder-width apart.",
      "Hinge hips back and bend knees to lower body until thighs are parallel to floor.",
      "Drive through heels to stand back up to starting position."
    ],
    tips: "Keep chest proud, core braced, and do not let knees cave inwards."
  },
  "bulgarian-split-squat": {
    name: "Bulgarian Split Squat",
    youtubeId: "2C-uF1uD2c0",
    category: "legs",
    steps: [
      "Stand 2-3 feet in front of bench, place one foot flat on bench behind you.",
      "Lower hips until back knee is just above floor and front thigh is parallel.",
      "Drive through front heel to return to standing position."
    ],
    tips: "Keep torso slightly hinged forward to load the glute, and keep front knee tracked over foot."
  },
  "barbell-bench-press": {
    name: "Barbell Bench Press",
    youtubeId: "rT7DgCr-3ps",
    category: "chest",
    steps: [
      "Lie on flat bench, grip barbell slightly wider than shoulders.",
      "Lower bar slowly to mid-chest, keeping elbows at 45 degrees.",
      "Press bar straight up to lockout while keeping shoulder blades pinned."
    ],
    tips: "Create a stable base by keeping feet flat on floor and squeezing shoulder blades together."
  },
  "dips": {
    name: "Chest Dips",
    youtubeId: "yN6Q1UI_xkE",
    category: "chest",
    steps: [
      "Grab parallel bars and lift body to arm extension.",
      "Lean torso slightly forward, bend elbows to lower body until shoulders are below elbows.",
      "Press through chest and triceps to extend arms back to start."
    ],
    tips: "Do not flare elbows; keep them tucked at a 45-degree angle to protect shoulder joints."
  },
  "pull-ups": {
    name: "Pull-Ups",
    youtubeId: "eGo4IYlbE5g",
    category: "back",
    steps: [
      "Hang from pull-up bar with overhand grip wider than shoulders.",
      "Pull chest to bar by driving elbows down and squeezing lats.",
      "Lower body with control to a full dead hang."
    ],
    tips: "Avoid swinging or using leg momentum. Squeeze shoulder blades at top."
  },
  "barbell-row": {
    name: "Barbell Bent-Over Row",
    youtubeId: "RQU8wZPshuA",
    category: "back",
    steps: [
      "Hinge hips at 45 degrees, grip barbell with overhand grip.",
      "Pull bar to lower stomach, pulling elbows high and back.",
      "Lower bar slowly under control to full arm extension."
    ],
    tips: "Keep back flat and neck neutral. Drive elbows to ceiling."
  },
  "deadlift": {
    name: "Conventional Barbell Deadlift",
    youtubeId: "ytGaGIn3SjY",
    category: "legs",
    steps: [
      "Stand with mid-foot under barbell, feet hip-width apart.",
      "Bend at hips and knees, grip bar, flatten back completely.",
      "Drive through heels to stand upright, locking out hips and knees."
    ],
    tips: "Keep bar close to shins. Push floor away; do not round your lower back."
  },
  "overhead-press": {
    name: "Barbell Overhead Press",
    youtubeId: "2yjwXTZQDDI",
    category: "shoulders",
    steps: [
      "Rest barbell on front shoulders, grip slightly wider than shoulders.",
      "Press bar straight overhead, moving head back slightly to clear bar.",
      "Lock arms out, push head forward, then lower bar to shoulders under control."
    ],
    tips: "Squeeze glutes and core to stabilize torso; do not lean backward."
  },
  "cable-lateral-raise": {
    name: "Cable Lateral Raise",
    youtubeId: "PPrzBWZcQLg",
    category: "shoulders",
    steps: [
      "Stand next to low pulley cable, hold handle with outer hand.",
      "Raise arm out to side in wide arc to shoulder height.",
      "Lower cable slowly, keeping tension on side deltoid."
    ],
    tips: "Allows constant tension. Do not swing or shrug shoulders."
  },
  "bicep-preacher-curl": {
    name: "Barbell Preacher Curl",
    youtubeId: "fIWP-FRFNU0",
    category: "arms",
    steps: [
      "Sit at preacher bench, rest upper arms flat on pad.",
      "Hold barbell or EZ bar, curl bar up towards face.",
      "Lower bar slowly to full arm extension under control."
    ],
    tips: "Keeps shoulders completely isolated. Focus on the stretch at the bottom."
  },
  "cable-overhead-extension": {
    name: "Cable Overhead Triceps Extension",
    youtubeId: "M6M_fNq25E4",
    category: "arms",
    steps: [
      "Hold rope attachment, turn away from cable machine, lean forward.",
      "Extend arms straight overhead and forward, keeping elbows fixed.",
      "Bend elbows to return rope slowly behind head."
    ],
    tips: "Provides deep stretch in the long head of the triceps. Keep elbows pinned."
  },
  "cable-bicep-curl": {
    name: "Cable Bicep Curl",
    youtubeId: "AsAdkFPv2c0",
    category: "arms",
    steps: [
      "Stand facing cable stack, hold straight bar attachment with underhand grip.",
      "Curl bar up, keeping elbows pinned to sides.",
      "Lower bar slowly, maintaining constant cable tension."
    ],
    tips: "Keep chest tall and do not use hips to swing the weight."
  },
  "hanging-leg-raise": {
    name: "Hanging Leg Raise",
    youtubeId: "jOpoaTItcoA",
    category: "core",
    steps: [
      "Hang from pull-up bar with straight arms.",
      "Raise legs straight up to 90 degrees or higher, using core.",
      "Lower legs slowly with control, avoiding body swing."
    ],
    tips: "If too difficult, perform hanging knee raises to target lower abs."
  },
  "russian-twist": {
    name: "Russian Twist",
    youtubeId: "LsR0ZsGsK2Y",
    category: "core",
    steps: [
      "Sit on floor, lean back slightly, elevate feet.",
      "Hold medicine ball or plate, rotate torso from side to side.",
      "Touch weight to floor on each side."
    ],
    tips: "Rotate your entire ribcage, not just your arms. Keep core braced."
  },
  "ab-wheel-rollout": {
    name: "Ab Wheel Rollout",
    youtubeId: "rqiPxEd76C0",
    category: "core",
    steps: [
      "Kneel on pad, hold ab wheel handles on floor under chest.",
      "Roll wheel straight forward, extending body as far as possible without arching back.",
      "Contract abs to pull wheel back to starting position."
    ],
    tips: "Tuck tailbone slightly (posterior pelvic tilt) to protect lower back."
  },
  "rowing-machine": {
    name: "Rowing Machine Cardio",
    youtubeId: "zQ-7A6c-u0M",
    category: "cardio",
    steps: [
      "Sit on seat, strap feet, grab handle with straight arms.",
      "Drive hard with legs, lean back slightly, pull handle to chest.",
      "Extend arms, hinge torso forward, bend knees to slide forward."
    ],
    tips: "Power is 60% legs, 20% core, 20% arms. Maintain flat back."
  },
  "burpees": {
    name: "Burpees",
    youtubeId: "dZgVxmf6jkA",
    category: "cardio",
    steps: [
      "Drop from standing into squat position, place hands on floor.",
      "Jump feet back to push-up position, touch chest to floor.",
      "Jump feet forward to hands, stand and leap upward with arms overhead."
    ],
    tips: "Land softly on midfoot, maintain steady breathing pace."
  },
  "jump-rope": {
    name: "Jump Rope",
    youtubeId: "u3zgHI8K5Ew",
    category: "cardio",
    steps: [
      "Hold handles, stand in front of rope.",
      "Swing rope overhead and jump slightly as it passes feet.",
      "Bounce on balls of feet, keep elbow motion tight."
    ],
    tips: "Jump only 1-2 inches off floor. Rotate rope from wrists, not shoulders."
  },
  "foam-rolling": {
    name: "Foam Rolling Recovery",
    youtubeId: "1bC7v7G1g54",
    category: "mobility",
    steps: [
      "Place foam roller under target muscle group (e.g. IT band, lats, upper back).",
      "Roll slowly back and forth over muscle to release tension.",
      "Pause on tight spots for 20-30 seconds to trigger release."
    ],
    tips: "Do not roll over joints or lower back. Breathe deeply."
  },
  "world-greatest-stretch": {
    name: "World's Greatest Stretch",
    youtubeId: "-5Kz8-C2hJ0",
    category: "mobility",
    steps: [
      "Step forward into deep lunge, place opposite hand on floor.",
      "Rotate torso and reach outer arm straight up to sky, looking at hand.",
      "Bring elbow down to inside of front foot, then push hips back to stretch hamstring."
    ],
    tips: "Takes hips, thoracic spine, and hamstrings through full range. Hold each position 2 seconds."
  },
  "pec-fly": {
    name: "Pec Fly (Machine)",
    youtubeId: "eGjt4lk6g34",
    category: "chest",
    steps: [
      "Sit on the machine with your back flat against the pad.",
      "Grip the handles, keep elbows slightly bent, and pull hands together in front of chest.",
      "Slowly return to the starting position, feeling a deep chest stretch."
    ],
    tips: "Keep your chest puffed out and squeeze hard at the peak contraction."
  },
  "pullover": {
    name: "Dumbbell Pullover",
    youtubeId: "5Ys6HdyVn3A",
    category: "chest",
    steps: [
      "Lie perpendicular on a flat bench with only your upper back supported.",
      "Hold a dumbbell with both hands directly above your chest.",
      "Lower the dumbbell in an arc behind your head until your arms are in line with your torso.",
      "Pull the dumbbell back to the starting position."
    ],
    tips: "Focus on stretching your chest and lats. Keep a slight bend in your elbows."
  },
  "close-grip-pulldown": {
    name: "Close-Grip Pulldown",
    youtubeId: "j9n7-d6gAkg",
    category: "back",
    steps: [
      "Attach a close-grip handle (V-bar) to the lat pulldown station.",
      "Sit down, tuck thighs under pads, and pull the handle down to your upper chest.",
      "Squeeze your shoulder blades and drive your elbows down and back.",
      "Release back up slowly to a full stretch."
    ],
    tips: "Keep your chest tall and lean back slightly as you pull. Squeeze your lats."
  },
  "t-bar-row": {
    name: "T-Bar Row",
    youtubeId: "j3Igk5abdZ0",
    category: "back",
    steps: [
      "Load the T-Bar machine or bar in a landmine attachment and stand over it.",
      "Bend at the hips with a flat back and grip the handles.",
      "Pull the weight towards your chest by driving your elbows backward.",
      "Lower the weight back down slowly until your arms are fully extended."
    ],
    tips: "Do not round your lower back. Keep your core tight and neck neutral."
  },
  "hyperextension": {
    name: "Back Hyperextension",
    youtubeId: "ww941aZ432Q",
    category: "back",
    steps: [
      "Position yourself on a hyperextension bench with thighs flat on pads.",
      "Cross your arms or hold a weight at your chest, then bend forward from the hips.",
      "Raise your torso until your body forms a straight line from head to heels."
    ],
    tips: "Do not hyperextend (arch) your lower back past the straight body line. Squeeze glutes."
  },
  "barbell-curl": {
    name: "Barbell Curl",
    youtubeId: "QZEqB6wUPxQ",
    category: "arms",
    steps: [
      "Stand tall, holding a barbell with an underhand grip at shoulder-width.",
      "Keep elbows pinned to your sides and curl the bar up toward shoulders.",
      "Lower the bar slowly to the starting position."
    ],
    tips: "Keep your torso still; do not use momentum or swing your body."
  },
  "skull-crusher": {
    name: "Lying Tricep Extension (Skull Crusher)",
    youtubeId: "d_KZxkY_0cM",
    category: "arms",
    steps: [
      "Lie on a flat bench, holding an EZ-bar or dumbbells straight up over shoulders.",
      "Bend at the elbows to lower the weight down towards your forehead or slightly behind.",
      "Press the weight back up to the starting position by extending the elbows."
    ],
    tips: "Keep your upper arms stationary and elbows pointed forward, not flared out."
  },
  "tricep-dips": {
    name: "Tricep Dips",
    youtubeId: "6kALZHqpUx4",
    category: "arms",
    steps: [
      "Position your hands shoulder-width apart on parallel bars or a bench.",
      "Lower your body by bending your elbows until your upper arms are parallel to the floor.",
      "Push back up to extend the arms fully."
    ],
    tips: "Keep your elbows close to your body and torso relatively upright to isolate the triceps."
  },
  "squats": {
    name: "Barbell Back Squat",
    youtubeId: "SW_C1A-T054",
    category: "legs",
    steps: [
      "Rest the barbell on your upper back (traps) and stand with feet shoulder-width apart.",
      "Lower your body by bending at the hips and knees, keeping your chest proud.",
      "Go down until thighs are parallel or just below parallel to the floor.",
      "Drive back up through the heels to full standing extension."
    ],
    tips: "Keep your knees tracking in line with your toes. Avoid caving knees."
  },
  "sumo-squats": {
    name: "Sumo Squat",
    youtubeId: "w77Z1V5K2bM",
    category: "legs",
    steps: [
      "Stand with a wide stance (feet wider than shoulders) and toes pointed out at 45 degrees.",
      "Hold a dumbbell vertically between legs or load a barbell on your back.",
      "Lower your hips down and back while pushing knees out.",
      "Push back up to stand."
    ],
    tips: "Sumo squats emphasize the inner thighs (adductors) and glutes. Push knees out."
  },
  "elliptical": {
    name: "Elliptical Cardio",
    youtubeId: "0bM-rGzEa_M",
    category: "cardio",
    steps: [
      "Step onto the machine pedals and grip the handles.",
      "Start pedaling in a smooth, continuous forward motion.",
      "Maintain an upright posture, engaging your core and pushing through your feet."
    ],
    tips: "Vary the resistance and incline for a higher calorie burn."
  },
  "cycling": {
    name: "Stationary Cycling",
    youtubeId: "r-92sHj0p3Q",
    category: "cardio",
    steps: [
      "Adjust the seat height so your leg is almost fully extended at the bottom of the pedal stroke.",
      "Grip the handlebars and pedal at a steady, consistent pace (cadence).",
      "Keep a tall posture and draw shoulders down away from ears."
    ],
    tips: "Vary the resistance to simulate flat roads and hills for higher calorie burn."
  }
};

/* ============================================================
   3. WEEKLY WORKOUT SCHEDULE (weeklySchedule)
   ============================================================ */
const weeklySchedule = [
  {
    day: "Monday",
    type: "Chest & Shoulders",
    focus: "Push strength and shoulder width",
    exercises: [
      { name: "Warm-Up (8-10 min)", sets: "", reps: "Stretch & Mobility", exerciseId: "warm-up" },
      { name: "Dumbbell Press", sets: "4", reps: "8-12", exerciseId: "db-bench-press" },
      { name: "Dumbbell Fly", sets: "3", reps: "10-12", exerciseId: "chest-fly" },
      { name: "Pec Fly (Machine)", sets: "3", reps: "10-12", exerciseId: "pec-fly" },
      { name: "Dumbbell Pullover", sets: "3", reps: "10-12", exerciseId: "pullover" },
      { name: "Shoulder Press", sets: "4", reps: "8-12", exerciseId: "db-shoulder-press" },
      { name: "Side Lateral Raise", sets: "4", reps: "12-15", exerciseId: "lateral-raises" },
      { name: "Front Raise", sets: "3", reps: "10-12", exerciseId: "front-raises" },
      { name: "Face Pulls", sets: "3", reps: "12-15", exerciseId: "face-pulls" },
      { name: "Dumbbell Shrugs", sets: "3", reps: "10-12", exerciseId: "shrugs" },
      { name: "Cool-Down (3-5 min)", sets: "", reps: "Static Stretching", exerciseId: "cool-down" }
    ]
  },
  {
    day: "Tuesday",
    type: "Back & Biceps",
    focus: "Posterior chain density and arm thickness",
    exercises: [
      { name: "Warm-Up (8-10 min)", sets: "", reps: "Stretch & Mobility", exerciseId: "warm-up" },
      { name: "Lat Pulldown", sets: "4", reps: "8-12", exerciseId: "lat-pulldown" },
      { name: "Close-Grip Pulldown", sets: "3", reps: "10-12", exerciseId: "close-grip-pulldown" },
      { name: "Seated Cable Row", sets: "3", reps: "10-12", exerciseId: "seated-row" },
      { name: "T-Bar Row", sets: "3", reps: "8-12", exerciseId: "t-bar-row" },
      { name: "Back Hyperextension", sets: "3", reps: "12-15", exerciseId: "hyperextension" },
      { name: "Dumbbell Curl", sets: "3", reps: "10-12", exerciseId: "db-curl" },
      { name: "Barbell Curl", sets: "3", reps: "8-12", exerciseId: "barbell-curl" },
      { name: "Hammer Curl", sets: "3", reps: "10-12", exerciseId: "hammer-curl" },
      { name: "Cool-Down (3-5 min)", sets: "", reps: "Static Stretching", exerciseId: "cool-down" }
    ]
  },
  {
    day: "Wednesday",
    type: "Cardio Day",
    focus: "Aerobic capacity and active recovery",
    exercises: [
      { name: "Warm-Up (8-10 min)", sets: "", reps: "Stretch & Mobility", exerciseId: "warm-up" },
      { name: "Incline Treadmill Walk", sets: "", reps: "20-30 Min", exerciseId: "incline-walk" },
      { name: "Stationary Cycling", sets: "", reps: "15-20 Min", exerciseId: "cycling" },
      { name: "Elliptical Trainer", sets: "", reps: "15 Min", exerciseId: "elliptical" },
      { name: "Cool-Down (3-5 min)", sets: "", reps: "Static Stretching", exerciseId: "cool-down" }
    ]
  },
  {
    day: "Thursday",
    type: "Triceps & Chest",
    focus: "Push volume, triceps extension and chest overload",
    exercises: [
      { name: "Warm-Up (8-10 min)", sets: "", reps: "Stretch & Mobility", exerciseId: "warm-up" },
      { name: "Push-ups", sets: "3", reps: "Max", exerciseId: "push-ups" },
      { name: "Lying Tricep Extension (Skull Crusher)", sets: "3", reps: "8-12", exerciseId: "skull-crusher" },
      { name: "Tricep Pushdown", sets: "3", reps: "10-12", exerciseId: "tricep-pushdown" },
      { name: "Overhead Tricep Extension", sets: "3", reps: "10-12", exerciseId: "overhead-tricep-ext" },
      { name: "Tricep Dips", sets: "3", reps: "Max", exerciseId: "tricep-dips" },
      { name: "Dumbbell Press", sets: "3", reps: "8-12", exerciseId: "db-bench-press" },
      { name: "Dumbbell Fly", sets: "3", reps: "10-12", exerciseId: "chest-fly" },
      { name: "Pec Fly (Machine)", sets: "3", reps: "10-12", exerciseId: "pec-fly" },
      { name: "Dumbbell Pullover", sets: "3", reps: "10-12", exerciseId: "pullover" },
      { name: "Cool-Down (3-5 min)", sets: "", reps: "Static Stretching", exerciseId: "cool-down" }
    ]
  },
  {
    day: "Friday",
    type: "Back & Biceps",
    focus: "Posterior chain density and arm thickness",
    exercises: [
      { name: "Warm-Up (8-10 min)", sets: "", reps: "Stretch & Mobility", exerciseId: "warm-up" },
      { name: "Lat Pulldown", sets: "4", reps: "8-12", exerciseId: "lat-pulldown" },
      { name: "Close-Grip Pulldown", sets: "3", reps: "10-12", exerciseId: "close-grip-pulldown" },
      { name: "Seated Cable Row", sets: "3", reps: "10-12", exerciseId: "seated-row" },
      { name: "T-Bar Row", sets: "3", reps: "8-12", exerciseId: "t-bar-row" },
      { name: "Back Hyperextension", sets: "3", reps: "12-15", exerciseId: "hyperextension" },
      { name: "Dumbbell Curl", sets: "3", reps: "10-12", exerciseId: "db-curl" },
      { name: "Barbell Curl", sets: "3", reps: "8-12", exerciseId: "barbell-curl" },
      { name: "Hammer Curl", sets: "3", reps: "10-12", exerciseId: "hammer-curl" },
      { name: "Cool-Down (3-5 min)", sets: "", reps: "Static Stretching", exerciseId: "cool-down" }
    ]
  },
  {
    day: "Saturday",
    type: "Leg Day",
    focus: "Lower body power, leg size and calf growth",
    exercises: [
      { name: "Warm-Up (8-10 min)", sets: "", reps: "Stretch & Mobility", exerciseId: "warm-up" },
      { name: "Barbell Back Squat", sets: "4", reps: "8-12", exerciseId: "squats" },
      { name: "Sumo Squat", sets: "3", reps: "10-12", exerciseId: "sumo-squats" },
      { name: "Walking Lunges", sets: "3", reps: "10 each", exerciseId: "walking-lunges" },
      { name: "Leg Press", sets: "3", reps: "10-12", exerciseId: "leg-press" },
      { name: "Leg Extension", sets: "3", reps: "12-15", exerciseId: "leg-extension" },
      { name: "Leg Curl", sets: "3", reps: "12-15", exerciseId: "leg-curl" },
      { name: "Standing Calf Raise", sets: "4", reps: "15-20", exerciseId: "calf-raise" },
      { name: "Cool-Down (3-5 min)", sets: "", reps: "Static Stretching", exerciseId: "cool-down" }
    ]
  },
  {
    day: "Sunday",
    type: "Recovery Day",
    focus: "Let the body recover and grow",
    exercises: [
      { name: "Walking (Cardio)", sets: "", reps: "30-45 Min", exerciseId: "walking" },
      { name: "Light stretching", sets: "", reps: "15-20 Min", exerciseId: "light-stretching" },
      { name: "Mobility work", sets: "", reps: "10-15 Min", exerciseId: "mobility-work" }
    ]
  }
];

/* ============================================================
   4. CONSTANTS & APPLICATION STATE
   ============================================================ */
window.addEventListener("error", (event) => {
  showCrashScreen(event.error || new Error(event.message));
});
window.addEventListener("unhandledrejection", (event) => {
  showCrashScreen(event.reason || new Error("Unhandled Promise Rejection: " + event.reason));
});

function resetAppAndReload() {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.warn("Reset storage failed", e);
  }
  location.reload();
}

function showCrashScreen(error) {
  console.error("DuoGym CRASHED:", error);
  const render = () => {
    if (!document.body) {
      setTimeout(render, 50);
      return;
    }
    // Prevent duplicate crash screens
    if (DOM.get("duogym-crash-overlay")) return;

    const crashDiv = document.createElement("div");
    crashDiv.id = "duogym-crash-overlay";
    crashDiv.style.position = "fixed";
    crashDiv.style.top = "0";
    crashDiv.style.left = "0";
    crashDiv.style.width = "100vw";
    crashDiv.style.height = "100vh";
    crashDiv.style.background = "#040406";
    crashDiv.style.color = "#ff2a5f";
    crashDiv.style.display = "flex";
    crashDiv.style.flexDirection = "column";
    crashDiv.style.alignItems = "center";
    crashDiv.style.justifyContent = "center";
    crashDiv.style.padding = "24px";
    crashDiv.style.zIndex = "999999";
    crashDiv.style.fontFamily = "sans-serif";
    crashDiv.style.textAlign = "center";

    crashDiv.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
      <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 8px; color: #fff;">Application Error</h2>
      <p style="font-size: 13px; color: #9ca3af; max-width: 400px; margin-bottom: 20px; line-height: 1.5;">
        DuoGym encountered a startup error. This is usually due to legacy browser storage conflicts.
      </p>
      <pre style="background: rgba(255, 42, 95, 0.08); border: 1px solid rgba(255, 42, 95, 0.15); border-radius: 6px; padding: 12px; font-size: 11px; max-width: 90%; overflow-x: auto; color: #ff557f; font-family: monospace; text-align: left; margin-bottom: 24px; max-height: 150px; width: 100%;">
${error ? error.stack || error.message : "Unknown error"}
      </pre>
      <div style="display: flex; gap: 12px;">
        <button onclick="location.reload()" style="background: #22c55e; color: #fff; border: none; padding: 10px 20px; font-size: 13px; font-weight: 600; border-radius: 6px; cursor: pointer;">
          Retry
        </button>
        <button onclick="resetAppAndReload()" style="background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.15); padding: 10px 20px; font-size: 13px; font-weight: 600; border-radius: 6px; cursor: pointer;">
          Reset App Data
        </button>
      </div>
    `;
    document.body.appendChild(crashDiv);
  };
  render();
}

const safeStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("safeStorage getItem failed for key: " + key, e);
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("safeStorage setItem failed for key: " + key, e);
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("safeStorage removeItem failed for key: " + key, e);
    }
  }
};

let lucideTimeout = null;
function safeCreateIcons() {
  if (typeof lucide !== "undefined" && lucide.createIcons) {
    if (lucideTimeout) cancelAnimationFrame(lucideTimeout);
    lucideTimeout = requestAnimationFrame(() => {
      try {
        lucide.createIcons();
      } catch (e) {
        console.warn("Lucide icon creation failed", e);
      }
      lucideTimeout = null;
    });
  }
}

const LOCAL_STORAGE_KEY = "duogym_fitness_data";
const START_DATE_STR = "2026-06-15"; // Monday
const END_DATE_STR = "2027-06-15";   // Tuesday

const STARTING_WEIGHTS = {
  aman: 94.6,
  rishit: 92.7
};

function getStartingWeight(user) {
  return Number(STARTING_WEIGHTS[user]) || 80;
}

function createEmptyUserData(user) {
  return {
    workouts: {},
    weights: { [START_DATE_STR]: getStartingWeight(user) },
    notes: { general: "" },
    measurements: {},
    photos: {},
    goalWeight: 75,
    badges: []
  };
}

function ensureUserData(user) {
  if (!user) return;
  if (!fitnessData[user]) fitnessData[user] = createEmptyUserData(user);
  ensureDateRecord(user, selectedDate || START_DATE_STR);
}

// Global App State variables
let fitnessData = {};
let currentUser = "aman";
let selectedDate = ""; // String "YYYY-MM-DD"
let activePage = "today";

/* ============================================================
   5. DATE HELPER UTILITIES
   ============================================================ */

// Formats a "YYYY-MM-DD" string into a long friendly date
function formatDateLong(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const options = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

// Formats a "YYYY-MM-DD" string into a date suitable for the navigator bar (shorter on mobile)
function formatDateNav(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const isMobile = window.innerWidth <= 480;
  const options = isMobile
    ? { weekday: "short", month: "short", day: "numeric", year: "numeric" }
    : { weekday: "long", month: "long", day: "numeric", year: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

// Returns the weekday name (e.g. "Monday") for a "YYYY-MM-DD" string
function getWeekdayName(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return weekdays[date.getDay()];
}

// Converts a Date object into local "YYYY-MM-DD" string
function dateToYYYYMMDD(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Adjusts the selected date by +/- offset days, bounding within subscription period
function adjustDate(offset) {
  const [year, month, day] = selectedDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + offset);
  
  const newDateStr = dateToYYYYMMDD(date);
  if (isWithinSubscription(newDateStr)) {
    selectedDate = newDateStr;
    DOM.get("checkin-date-picker").value = selectedDate;
    updatePageContent();
  }
}

// Trigger date picker overlay click
function triggerDatePicker() {
  DOM.get("checkin-date-picker").showPicker();
}

// Sets the selected date directly from date picker input
function setDateFromPicker(value) {
  if (isWithinSubscription(value)) {
    selectedDate = value;
    updatePageContent();
  } else {
    alert(`Please select a date within the subscription period: ${formatDateLong(START_DATE_STR)} to ${formatDateLong(END_DATE_STR)}`);
    DOM.get("checkin-date-picker").value = selectedDate;
  }
}

// Checks if a date string is in the 15 Jun 2026 – 15 Jun 2027 range
function isWithinSubscription(dateStr) {
  return dateStr >= START_DATE_STR && dateStr <= END_DATE_STR;
}

// Jump selectedDate back to the current real-world date (if in bounds), or START_DATE
function jumpToToday() {
  const todayStr = dateToYYYYMMDD(new Date());
  if (isWithinSubscription(todayStr)) {
    selectedDate = todayStr;
  } else {
    selectedDate = START_DATE_STR;
  }
  DOM.get("checkin-date-picker").value = selectedDate;
  updatePageContent();
}

/* ============================================================
   6. LOCAL STORAGE DATA MANAGEMENT
   ============================================================ */

// Returns default empty data structures for users
function initData() {
  return {
    aman: {
      workouts: {},
      weights: { "2026-06-15": STARTING_WEIGHTS.aman },
      notes: { general: "" },
      measurements: {},
      photos: {},
      goalWeight: 80.0,
      badges: []
    },
    rishit: {
      workouts: {},
      weights: { "2026-06-15": STARTING_WEIGHTS.rishit },
      notes: { general: "" },
      measurements: {},
      photos: {},
      goalWeight: 80.0,
      badges: []
    },
    lastBackup: null
  };
}

// Load data from localStorage and perform migrations if necessary
function loadData() {
  const stored = safeStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored) {
    try {
      fitnessData = JSON.parse(stored);
      // Migrate structure if it's the old format
      migrateDataIfNecessary();
    } catch (e) {
      console.error("Error parsing fitness data from localStorage, initializing fresh", e);
      fitnessData = initData();
      saveData();
    }
  } else {
    fitnessData = initData();
    saveData();
  }
  loadDietData();
}

// Automatic migration utility for older storage formats
function migrateDataIfNecessary() {
  let migrated = false;
  
  // Initialize base wrapper if not present
  if (!fitnessData) {
    fitnessData = initData();
    migrated = true;
  }
  
  const knownUsers = new Set(["aman", "rishit", authenticatedUser].filter(Boolean));
  Object.keys(fitnessData).forEach(key => {
    if (fitnessData[key] && typeof fitnessData[key] === "object" && key !== "lastBackup") knownUsers.add(key);
  });
  for (const user of knownUsers) {
    if (!fitnessData[user]) {
      fitnessData[user] = createEmptyUserData(user);
      migrated = true;
      continue;
    }
    
    // Ensure nested objects exist
    if (!fitnessData[user].workouts) {
      fitnessData[user].workouts = {};
      migrated = true;
    }
    if (!fitnessData[user].weights) {
      fitnessData[user].weights = {};
      migrated = true;
    }
    if (!fitnessData[user].notes) {
      fitnessData[user].notes = {};
      migrated = true;
    }
    if (!fitnessData[user].measurements) {
      fitnessData[user].measurements = {};
      migrated = true;
    }
    if (!fitnessData[user].photos) {
      fitnessData[user].photos = {};
      migrated = true;
    }
    if (fitnessData[user].goalWeight === undefined) {
      fitnessData[user].goalWeight = 80.0;
      migrated = true;
    }
    if (!fitnessData[user].badges) {
      fitnessData[user].badges = [];
      migrated = true;
    }
    
    // 1. Migrate direct date-based workout properties (e.g. key like "2026-08-15")
    for (const key in fitnessData[user]) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        fitnessData[user].workouts[key] = fitnessData[user][key];
        delete fitnessData[user][key];
        migrated = true;
      }
    }
    
    // 2. Migrate old _weightHistory array to weights dictionary
    if (fitnessData[user]._weightHistory) {
      const history = fitnessData[user]._weightHistory;
      if (Array.isArray(history)) {
        history.forEach(entry => {
          if (entry.date && entry.weight) {
            fitnessData[user].weights[entry.date] = parseFloat(entry.weight);
          }
        });
      }
      delete fitnessData[user]._weightHistory;
      migrated = true;
    }
    
    // 3. Migrate old _generalNotes to notes.general
    if (fitnessData[user]._generalNotes !== undefined) {
      fitnessData[user].notes.general = fitnessData[user]._generalNotes;
      delete fitnessData[user]._generalNotes;
      migrated = true;
    }
    
    // Ensure starting weight is set in weights dictionary
    if (!fitnessData[user].weights["2026-06-15"]) {
      fitnessData[user].weights["2026-06-15"] = getStartingWeight(user);
      migrated = true;
    }
  }
  
  if (migrated) {
    saveData();
  }
}

// Save data to localStorage and trigger cloud sync
function saveData(syncToCloud = true) {
  invalidateStreaksCache(currentUser);
  invalidateActivityStreaksCache(currentUser);
  safeStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fitnessData));
  if (syncToCloud && typeof debouncedSync === 'function') debouncedSync();
}

// Returns the workout configuration for a given date based on weekday
function getWorkoutForDate(dateStr) {
  const weekday = getWeekdayName(dateStr);
  return weeklySchedule.find(w => w.day === weekday) || weeklySchedule[6]; // Default to Sunday Rest Day
}

function ensureDateRecord(user, dateStr) {
  if (!fitnessData[user]) {
    fitnessData[user] = { workouts: {}, weights: {}, notes: {}, measurements: {}, photos: {}, goalWeight: 80.0, badges: [] };
  }
  if (!fitnessData[user].workouts) {
    fitnessData[user].workouts = {};
  }
  if (!fitnessData[user].badges) {
    fitnessData[user].badges = [];
  }
  if (!fitnessData[user].activityData) {
    fitnessData[user].activityData = {
      movement: {},
      sleep: {},
      body: {},
      xp: { total: 0, level: 1, history: [] },
      races: { active: null, history: [] },
      streaks: { hydration: 0, sleep: 0, steps: 0 },
      challenges: { daily: {}, weekly: {} },
      feed: [],
      insights: { lastGenerated: null, items: [] }
    };
  }
  const activity = fitnessData[user].activityData;
  if (!activity.movement) activity.movement = {};
  if (!activity.sleep) activity.sleep = {};
  if (!activity.body) activity.body = {};
  if (!activity.feed) activity.feed = [];
  activity.feed = activity.feed.filter(item => item && !String(item.id || "").startsWith("mock-"));
  if (!activity.xp) activity.xp = { total: 0, level: 1, history: [] };
  if (!activity.xp.history) activity.xp.history = [];
  if (!activity.xpEvents) activity.xpEvents = {};
  if (!activity.races) activity.races = { active: null, history: [] };
  if (!activity.races.history) activity.races.history = [];
  if (!activity.challenges) activity.challenges = { daily: {}, weekly: {} };
  if (!activity.challenges.daily) activity.challenges.daily = {};
  if (!activity.goals) {
    activity.goals = { steps: 10000, activeMinutes: 60, activeCalories: 500, waterMl: 3500, sleepHours: 8 };
  }
  if (!fitnessData[user].workouts[dateStr]) {
    fitnessData[user].workouts[dateStr] = {
      completedExercises: [],
      skippedExercises: [],
      completionPercentage: 0,
      notes: "",
      waterIntake: 0
    };
  } else {
    if (!fitnessData[user].workouts[dateStr].completedExercises) {
      fitnessData[user].workouts[dateStr].completedExercises = [];
    }
    if (!fitnessData[user].workouts[dateStr].skippedExercises) {
      fitnessData[user].workouts[dateStr].skippedExercises = [];
    }
    if (fitnessData[user].workouts[dateStr].waterIntake === undefined) {
      fitnessData[user].workouts[dateStr].waterIntake = 0;
    }
  }
}

/* ============================================================
   7. NAVIGATION & STATE CONTROLLERS
   ============================================================ */

// Theme Toggle Handler
function toggleTheme() {
  const isLight = document.body.classList.toggle("light-mode");
  const themeIcon = DOM.get("theme-icon");
  
  if (isLight) {
    safeStorage.setItem("duogym_theme", "light");
    if (themeIcon) {
      themeIcon.setAttribute("data-lucide", "moon");
    }
  } else {
    safeStorage.setItem("duogym_theme", "dark");
    if (themeIcon) {
      themeIcon.setAttribute("data-lucide", "sun");
    }
  }
  
  safeCreateIcons();
}

// Switch the active user tab (Aman / Rishit)
function switchUser(user) {
  currentUser = user;
  
  // Save selected user to localStorage
  safeStorage.setItem("duogym_selected_user", user);
  
  // Update Android native background receiver context
  if (typeof AndroidApp !== "undefined" && AndroidApp.setCurrentUser) {
    try {
      AndroidApp.setCurrentUser(user);
    } catch (_) {}
  }
  
  // Update body css class for accent colors without wiping out other classes (like light-mode)
  document.body.classList.remove("user-aman", "user-rishit");
  document.body.classList.add(`user-${user}`);

  // Update tabs DOM classes
  const tabAman = DOM.get("tab-user-aman");
  const tabRishit = DOM.get("tab-user-rishit");
  if (tabAman) tabAman.classList.toggle("active", user === "aman");
  if (tabRishit) tabRishit.classList.toggle("active", user === "rishit");

  // Trigger layout switch animation
  const appContent = document.querySelector(".app-content");
  if (appContent) {
    appContent.classList.remove("profile-switching");
    requestAnimationFrame(() => {
      appContent.classList.add("profile-switching");
      setTimeout(() => {
        appContent.classList.remove("profile-switching");
      }, 600);
    });
  }

  // Re-render the active page elements
  updatePageContent();
}

// Switch between page panels (Today only)
function switchPage(pageId) {
  if (activePage === pageId) {
    updatePageContent();
    return;
  }
  activePage = pageId;
  const appContent = document.querySelector(".app-content");
  if (appContent) appContent.classList.add("is-page-switching");

  // Toggle active styling on navigation buttons
  const navIds = ["today", "diet", "dictionary", "activity"];
  navIds.forEach(id => {
    const btn = DOM.get(`nav-btn-${id}`);
    if (btn) btn.classList.toggle("active", id === pageId);
  });

  // Toggle active styling on section elements
  navIds.forEach(id => {
    const sec = DOM.get(`page-${id}`);
    if (sec) sec.classList.toggle("active", id === pageId);
  });

  if (appContent) {
    appContent.scrollTo({ top: 0, behavior: "smooth" });
  }

  requestAnimationFrame(() => {
    // Render content specific to the selected page
    updatePageContent();
    if (pageId === "activity") requestNativeActivitySync(true);
    setTimeout(() => {
      if (appContent) appContent.classList.remove("is-page-switching");
    }, 280);
  });
}

async function syncOpponentActivity() {
  if (!supabaseInitialized || !supabaseClient || !authenticatedUser || opponentSyncInFlight) return;
  if (Date.now() - lastOpponentSyncAt < 60000) return;
  opponentSyncInFlight = true;
  const opponent = getRivalUsername();
  if (!opponent) {
    opponentSyncInFlight = false;
    return;
  }
  try {
    const { data, error } = await supabaseClient
      .from("duogym_users_data")
      .select("username, fitness_data, last_synced")
      .eq("username", opponent)
      .maybeSingle();
    if (error) throw error;
    if (data && data.fitness_data) {
      fitnessData[opponent] = mergeUserData(fitnessData[opponent], data.fitness_data);
      saveData(false);
      if (activePage === "activity" && (activeActTab === "comp" || activeActTab === "feed")) {
        renderActivityCenter();
      }
    }
    lastOpponentSyncAt = Date.now();
  } catch (e) {
    console.warn("DuoGym: Opponent activity refresh failed", e ? (e.message || JSON.stringify(e)) : 'Unknown error');
  } finally {
    opponentSyncInFlight = false;
  }
}

function getRivalUsername() {
  if (authenticatedUser === "aman") return "rishit";
  if (authenticatedUser === "rishit") return "aman";
  return normalizeUsername(authenticatedProfile?.rival_username || safeStorage.getItem("fitrivals_rival_username") || "");
}

async function saveRivalUsername() {
  const input = DOM.get("rival-username-input");
  const rival = normalizeUsername(input?.value);
  if (!isValidUsername(rival) || rival === authenticatedUser) {
    alert("Enter another valid FitRivals username.");
    return;
  }
  try {
    const client = getSupabaseClient();
    const { data: rivalProfile, error: lookupError } = await client
      .from("fitrivals_profiles")
      .select("username")
      .eq("username", rival)
      .maybeSingle();
    if (lookupError || !rivalProfile) throw new Error("Rival username was not found.");
    const { error } = await client
      .from("fitrivals_profiles")
      .update({ rival_username: rival })
      .eq("id", authenticatedProfile.id);
    if (error) throw error;
    authenticatedProfile.rival_username = rival;
    setAuthSession(authenticatedProfile);
    safeStorage.setItem("fitrivals_rival_username", rival);
    lastOpponentSyncAt = 0;
    await syncOpponentActivity();
    renderActivityCenter();
  } catch (error) {
    alert(error.message || "Unable to set this rival.");
  }
}

// Route rendering depending on active page state
function updatePageContent() {
  clearAllRunningTimers();
  if (activePage === "today") {
    renderCheckIn();
  } else if (activePage === "diet") {
    renderDietTracker();
  } else if (activePage === "dictionary") {
    renderExerciseDictionary();
  } else if (activePage === "activity") {
    renderActivityCenter();
  }
  renderPremiumStatsStrip();
}

/* ============================================================
   8. PAGE RENDERERS
   ============================================================ */

/* ── RENDER PAGE 1: DAILY CHECK-IN ────────────────────────── */
function renderCheckIn() {
  ensureDateRecord(currentUser, selectedDate);
  evaluateMissionsAndBadges(); // Automatically evaluate daily missions & award badges
  
  const record = fitnessData[currentUser].workouts[selectedDate];
  const workout = getWorkoutForDate(selectedDate);

  // Dynamic stable motivational quote selector
  const quotes = [
    "NO EXCUSES. PURE HUSTLE.",
    "CRUSH YOUR GOALS TODAY.",
    "FAT VIBE GONE. SHRED TIME.",
    "SWEAT IS JUST FAT CRYING.",
    "THE ONLY BAD WORKOUT IS THE ONE THAT DIDN'T HAPPEN.",
    "HUSTLE FOR THAT MUSCLE.",
    "DISCIPLINE OUTLASTS MOTIVATION.",
    "BE BETTER THAN YOU WERE YESTERDAY.",
    "CHAMPIONS TRAIN, LOAFERS COMPLAIN.",
    "PAIN IS WEAKNESS LEAVING THE BODY."
  ];
  let charSum = 0;
  for (let i = 0; i < selectedDate.length; i++) {
    charSum += selectedDate.charCodeAt(i);
  }
  const quoteIndex = charSum % quotes.length;
  const quoteText = `"${quotes[quoteIndex]}"`;
  const quoteEl = DOM.get("header-motivation-quote");
  if (quoteEl) {
    quoteEl.textContent = quoteText;
  }

  // Set date text in navigator
  DOM.get("checkin-date-text").textContent = formatDateNav(selectedDate);
  DOM.get("checkin-date-picker").value = selectedDate;

  // Set workout header details
  DOM.get("workout-day-badge").textContent = `${getWeekdayName(selectedDate)} Workout`;
  DOM.get("workout-name-text").textContent = workout.type;
  DOM.get("workout-focus-text").textContent = workout.focus;

  // Missed yesterday's workout check (subtle notification)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = dateToYYYYMMDD(yesterday);
  const banner = DOM.get("yesterday-missed-banner");
  
  if (yesterdayStr >= START_DATE_STR && yesterdayStr <= END_DATE_STR && getWeekdayName(yesterdayStr) !== "Sunday") {
    ensureDateRecord(currentUser, yesterdayStr);
    const yesterdayRecord = fitnessData[currentUser].workouts[yesterdayStr];
    if (yesterdayRecord.completedExercises.length === 0) {
      banner.innerHTML = `<i data-lucide="alert-triangle"></i> <span>You missed yesterday's workout. Don't worry, get back on track today! 💪</span>`;
      banner.style.display = "flex";
    } else {
      banner.style.display = "none";
    }
  } else {
    banner.style.display = "none";
  }

  // Render Coach Bubble & Streak
  const coachFeedbackEl = DOM.get("coach-feedback-text");
  if (coachFeedbackEl) {
    coachFeedbackEl.innerHTML = getCoachFeedback();
  }
  const streakCountEl = DOM.get("streak-count-value");
  if (streakCountEl) {
    const streak = calculateStreaks(currentUser).currentStreak;
    streakCountEl.textContent = `${streak} Day${streak === 1 ? "" : "s"}`;
  }

  // Render Daily Missions status
  const missions = record.missions || { workout: false, diet: false, water: false };
  
  const wIcon = DOM.get("mission-workout-icon");
  const wRow = DOM.get("mission-workout-row");
  if (wIcon && wRow) {
    if (missions.workout) {
      wIcon.innerHTML = `<i data-lucide="check-circle-2" style="width: 16px; height: 16px; color: var(--success);"></i>`;
      wRow.style.opacity = "0.7";
    } else {
      wIcon.innerHTML = `<i data-lucide="circle" style="width: 16px; height: 16px; color: var(--text-muted);"></i>`;
      wRow.style.opacity = "1";
    }
  }

  const dIcon = DOM.get("mission-diet-icon");
  const dRow = DOM.get("mission-diet-row");
  if (dIcon && dRow) {
    if (missions.diet) {
      dIcon.innerHTML = `<i data-lucide="check-circle-2" style="width: 16px; height: 16px; color: var(--success);"></i>`;
      dRow.style.opacity = "0.7";
    } else {
      dIcon.innerHTML = `<i data-lucide="circle" style="width: 16px; height: 16px; color: var(--text-muted);"></i>`;
      dRow.style.opacity = "1";
    }
  }

  const hIcon = DOM.get("mission-water-icon");
  const hRow = DOM.get("mission-water-row");
  if (hIcon && hRow) {
    if (missions.water) {
      hIcon.innerHTML = `<i data-lucide="check-circle-2" style="width: 16px; height: 16px; color: var(--success);"></i>`;
      hRow.style.opacity = "0.7";
    } else {
      hIcon.innerHTML = `<i data-lucide="circle" style="width: 16px; height: 16px; color: var(--text-muted);"></i>`;
      hRow.style.opacity = "1";
    }
  }

  // Render Water Tracker Card
  const waterProgressEl = DOM.get("water-progress-value");
  if (waterProgressEl) {
    waterProgressEl.textContent = `${record.waterIntake || 0} / 3500 ml`;
  }
  const waterGlassesEl = DOM.get("water-glasses-count");
  if (waterGlassesEl) {
    const cups = Math.round((record.waterIntake || 0) / 250);
    waterGlassesEl.textContent = `${cups} of 14 cups (250ml)`;
  }
  
  const cupsContainer = DOM.get("water-cups-container");
  if (cupsContainer) {
    cupsContainer.innerHTML = "";
    const waterVal = record.waterIntake || 0;
    for (let i = 1; i <= 14; i++) {
      const cup = document.createElement("div");
      if (i * 250 <= waterVal) {
        cup.className = "water-cup-icon cup-filled";
        cup.innerHTML = `<i data-lucide="droplet" style="width: 14px; height: 14px;"></i>`;
      } else {
        cup.className = "water-cup-icon cup-empty";
        cup.innerHTML = `<i data-lucide="droplet" style="width: 14px; height: 14px; opacity: 0.3;"></i>`;
      }
      cup.onclick = () => {
        adjustWaterIntakeTo(i * 250);
      };
      cupsContainer.appendChild(cup);
    }
  }

  // Render Trophy Case Badges
  const userBadges = fitnessData[currentUser].badges || [];
  const allBadgesList = ["consistent-crusader", "gym-legend", "kitchen-master", "hydration-champ", "iron-discipline"];
  allBadgesList.forEach(badgeId => {
    const el = DOM.get(`badge-${badgeId}`);
    if (el) {
      if (userBadges.includes(badgeId)) {
        el.classList.remove("locked");
        el.classList.add("unlocked");
      } else {
        el.classList.add("locked");
        el.classList.remove("unlocked");
      }
    }
  });

  // Render checklist items
  const checklistContainer = DOM.get("checklist-container");
  checklistContainer.innerHTML = "";

  // If selectedDate is in the future, checklist rows should look disabled/read-only
  const isFutureDate = selectedDate > dateToYYYYMMDD(new Date());

  workout.exercises.forEach(ex => {
    const isChecked = record.completedExercises.includes(ex.exerciseId);
    const isSkipped = record.skippedExercises ? record.skippedExercises.includes(ex.exerciseId) : false;

    // Create row div
    const row = document.createElement("div");
    row.className = `checklist-row ${isChecked ? "checked" : ""} ${isSkipped ? "skipped" : ""}`;
    if (isFutureDate) {
      row.style.opacity = "0.6";
      row.style.cursor = "not-allowed";
      row.title = "Cannot log workouts for future dates.";
      row.onclick = () => alert("Cannot log workouts for future dates.");
    } else {
      row.onclick = () => toggleExerciseCheck(ex.exerciseId);
    }

    // Create left wrapper
    const left = document.createElement("div");
    left.className = "chk-left";

    // Custom checkbox markup
    const chkWrapper = document.createElement("div");
    chkWrapper.className = "custom-checkbox-wrapper";
    
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "custom-checkbox-input";
    input.checked = isChecked;
    input.disabled = isFutureDate || isSkipped;
    input.readOnly = true;

    const box = document.createElement("div");
    box.className = "custom-checkbox-box";

    chkWrapper.appendChild(input);
    chkWrapper.appendChild(box);

    // Label texts
    const label = document.createElement("div");
    label.className = "checklist-label";

    const nameSpan = document.createElement("span");
    nameSpan.className = "ex-name";
    nameSpan.textContent = ex.name;

    // Check if there are logged sets for this exercise
    const logList = record.exerciseLogs ? record.exerciseLogs[ex.exerciseId] : null;
    let logStr = "";
    if (logList && logList.length > 0) {
      const loggedSets = logList.filter(s => s.completed).map(s => {
        if (s.weight !== undefined && s.weight !== null && s.weight !== "") {
          return `${s.weight}kg×${s.reps}`;
        } else {
          return `${s.reps}r`;
        }
      });
      if (loggedSets.length > 0) {
        logStr = ` • Logged: ${loggedSets.join(", ")}`;
      }
    }

    const detailSpan = document.createElement("span");
    detailSpan.className = "ex-details";
    detailSpan.textContent = (ex.sets ? `${ex.sets} Sets × ${ex.reps}` : ex.reps) + logStr;

    label.appendChild(nameSpan);
    label.appendChild(detailSpan);

    left.appendChild(chkWrapper);
    left.appendChild(label);

    row.appendChild(left);

    // Inject inline timer container
    const timerContainer = document.createElement("div");
    timerContainer.className = "ex-timer-container";

    const target = parseTargetSeconds(ex.reps);
    let displayVal = formatTimerTime(target);
    let isCounting = false;

    const activeTimer = activeTimers[ex.exerciseId];
    if (activeTimer) {
      displayVal = formatTimerTime(activeTimer.remainingSeconds);
      isCounting = (activeTimer.state === 'running');
    }

    const timerDisplay = document.createElement("span");
    timerDisplay.className = "ex-timer-display";
    timerDisplay.id = `timer-val-${ex.exerciseId}`;
    
    if (isChecked) {
      timerDisplay.textContent = "DONE";
      timerDisplay.classList.add("completed");
    } else if (isSkipped) {
      timerDisplay.textContent = "SKIPPED";
      timerDisplay.style.color = "var(--danger)";
    } else {
      timerDisplay.textContent = displayVal;
      if (isCounting) {
        timerDisplay.classList.add("counting");
      }
    }

    const timerBtn = document.createElement("button");
    timerBtn.className = "btn-timer-play";
    timerBtn.id = `timer-btn-${ex.exerciseId}`;
    timerBtn.style.display = (isChecked || isSkipped) ? "none" : "flex";
    
    if (isCounting) {
      timerBtn.innerHTML = `<i data-lucide="pause" style="width: 14px; height: 14px;"></i>`;
    } else {
      timerBtn.innerHTML = `<i data-lucide="play" style="width: 14px; height: 14px;"></i>`;
    }
    
    timerDisplay.onclick = (e) => {
      e.stopPropagation();
      openTimerModal(ex.exerciseId, ex.name, ex.sets, ex.reps);
    };
    timerDisplay.style.cursor = "pointer";

    timerBtn.onclick = (e) => {
      e.stopPropagation(); // Prevent toggling the checklist row check state
      openTimerModal(ex.exerciseId, ex.name, ex.sets, ex.reps);
    };

    timerContainer.appendChild(timerDisplay);
    timerContainer.appendChild(timerBtn);
    row.appendChild(timerContainer);

    // If exercise steps/instructions exist, show a small info (i) button
    if (exerciseInstructions[ex.exerciseId]) {
      const infoBtn = document.createElement("button");
      infoBtn.className = "btn-icon-subtle";
      infoBtn.style.padding = "4px";
      infoBtn.style.marginLeft = "8px";
      infoBtn.style.flexShrink = "0";
      infoBtn.innerHTML = `<i data-lucide="info" style="width: 14px; height: 14px;"></i>`;
      infoBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent toggling the checklist item
        showExerciseInfo(ex.exerciseId);
      };
      row.appendChild(infoBtn);
    }

    // Add Skip Button
    if (!isFutureDate) {
      const skipBtn = document.createElement("button");
      skipBtn.className = `btn-icon-subtle btn-skip-ex ${isSkipped ? "active" : ""}`;
      skipBtn.style.padding = "4px";
      skipBtn.style.marginLeft = "4px";
      skipBtn.style.flexShrink = "0";
      if (isSkipped) {
        skipBtn.innerHTML = `<i data-lucide="ban" style="width: 14px; height: 14px; color: var(--danger);"></i>`;
      } else {
        skipBtn.innerHTML = `<i data-lucide="ban" style="width: 14px; height: 14px;"></i>`;
      }
      skipBtn.title = isSkipped ? "Unskip exercise" : "Skip exercise";
      skipBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent toggling check state
        toggleExerciseSkip(ex.exerciseId);
      };
      row.appendChild(skipBtn);
    }

    checklistContainer.appendChild(row);
  });

  safeCreateIcons();
  updateProgressBar();
  renderPremiumStatsStrip();
}

// Toggles checked state for an exercise in Today's checklist
function toggleExerciseCheck(exerciseId) {
  if (selectedDate > dateToYYYYMMDD(new Date())) {
    alert("Cannot log workouts for future dates.");
    return;
  }
  ensureDateRecord(currentUser, selectedDate);
  const record = fitnessData[currentUser].workouts[selectedDate];
  
  // If it was skipped, remove it from skipped
  if (record.skippedExercises) {
    const skipIdx = record.skippedExercises.indexOf(exerciseId);
    if (skipIdx !== -1) {
      record.skippedExercises.splice(skipIdx, 1);
    }
  }

  const index = record.completedExercises.indexOf(exerciseId);
  if (index === -1) {
    record.completedExercises.push(exerciseId);
    playSuccessSound(); // Play motivational chime sound
    
    // Auto-create default set logs if none exist
    if (!record.exerciseLogs) record.exerciseLogs = {};
    if (!record.exerciseLogs[exerciseId]) {
      const workout = getWorkoutForDate(selectedDate);
      const ex = workout ? workout.exercises.find(e => e.exerciseId === exerciseId) : null;
      const setsCount = ex ? parseTotalSets(ex.sets, ex.reps) : 3;
      const targetReps = ex ? (parseInt(ex.reps) || 10) : 10;
      
      record.exerciseLogs[exerciseId] = Array(setsCount).fill(null).map(() => ({
        weight: "",
        reps: targetReps,
        completed: true
      }));
    }

    // Stop running timer if checked manually
    const timer = activeTimers[exerciseId];
    if (timer) {
      if (timer.intervalId) clearInterval(timer.intervalId);
      delete activeTimers[exerciseId];
    }
  } else {
    record.completedExercises.splice(index, 1);
    
    // Delete sets logs on uncheck
    if (record.exerciseLogs && record.exerciseLogs[exerciseId]) {
      delete record.exerciseLogs[exerciseId];
    }

    // Stop running timer on uncheck
    const timer = activeTimers[exerciseId];
    if (timer) {
      if (timer.intervalId) clearInterval(timer.intervalId);
      delete activeTimers[exerciseId];
    }
  }

  // Recalculate percentage
  const workout = getWorkoutForDate(selectedDate);
  const total = workout.exercises.length;
  const completed = record.completedExercises.length;
  record.completionPercentage = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;

  saveData();
  evaluateMissionsAndBadges();
  renderCheckIn();
}

// Updates progress bar visual states dynamically
function updateProgressBar() {
  const record = fitnessData[currentUser].workouts[selectedDate];
  const workout = getWorkoutForDate(selectedDate);
  const total = workout.exercises.length;
  const completed = record ? record.completedExercises.length : 0;
  const percent = record ? record.completionPercentage : 0;

  const percentEl = DOM.get("workout-progress-percent");
  if (percentEl) percentEl.textContent = `${percent}%`;
  
  const fillEl = DOM.get("workout-progress-fill");
  if (fillEl) fillEl.style.width = `${percent}%`;
  
  const countEl = DOM.get("workout-count-text");
  if (countEl) countEl.textContent = `Completed: ${completed} of ${total} exercises`;
}

/* ── RENDER BACKUP MANAGER ────────────────────────────────── */
function renderNotes() {
  // Render last backup status info
  const backupText = DOM.get("last-backup-text");
  const backupIcon = DOM.get("backup-status-icon");
  if (backupText && backupIcon) {
    const lastBackup = fitnessData.lastBackup;
    if (lastBackup) {
      backupText.innerHTML = `Last Backup: <strong style="color: var(--success);">${formatDateLong(lastBackup)}</strong>`;
      backupIcon.setAttribute("data-lucide", "check-circle-2");
      backupIcon.style.color = "var(--success)";
    } else {
      backupText.innerHTML = `Last Backup: <strong style="color: var(--text-muted);">Never</strong>`;
      backupIcon.setAttribute("data-lucide", "info");
      backupIcon.style.color = "var(--text-muted)";
    }
  }

  // Populate Supabase credentials inputs
  const storedUrl = safeStorage.getItem("duogym_supabase_url") || "";
  const storedKey = safeStorage.getItem("duogym_supabase_key") || "";
  const urlInput = DOM.get("sb-url-input");
  const keyInput = DOM.get("sb-key-input");
  if (urlInput) urlInput.value = storedUrl;
  if (keyInput) keyInput.value = storedKey;

  // Render One Rep Max calculator results
  calculateOneRepMax();

  safeCreateIcons();
}

function saveAndConnectSupabase() {
  const url = DOM.get('sb-url-input').value.trim();
  const key = DOM.get('sb-key-input').value.trim();
  
  if (!url || !key) {
    alert("Please enter both the Supabase URL and Anon Key.");
    return;
  }
  
  safeStorage.setItem("duogym_supabase_url", url);
  safeStorage.setItem("duogym_supabase_key", key);
  
  alert("Supabase credentials saved. Initializing connection...");
  
  // Re-initialize Supabase sync
  initSupabaseSync(authenticatedUser || currentUser);
}

function copySupabaseSQL() {
  const code = DOM.get('sb-sql-code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    alert("SQL script copied to clipboard! Run this in your Supabase SQL Editor.");
  }).catch(e => {
    alert("Failed to copy. Please select and copy manually.");
  });
}

function calculateOneRepMax() {
  const wInput = DOM.get("calc-weight");
  const rInput = DOM.get("calc-reps");
  
  if (!wInput || !rInput) return;
  
  const w = parseFloat(wInput.value) || 0;
  const r = parseInt(rInput.value, 10) || 0;
  
  const el1rm = DOM.get("calc-1rm-val");
  const elPower = DOM.get("calc-power-val");
  const elHyper = DOM.get("calc-hyper-val");
  const elEndur = DOM.get("calc-endur-val");
  
  if (w <= 0 || r <= 0) {
    if (el1rm) el1rm.textContent = "0.0 kg";
    if (elPower) elPower.textContent = "0.0 kg";
    if (elHyper) elHyper.textContent = "0.0 kg";
    if (elEndur) elEndur.textContent = "0.0 kg";
    return;
  }
  
  // Epley 1RM formula
  let oneRepMax = w * (1 + r / 30);
  if (r === 1) oneRepMax = w; // 1 rep is exactly 1RM
  
  const p90 = oneRepMax * 0.9;
  const p80 = oneRepMax * 0.8;
  const p70 = oneRepMax * 0.7;
  
  if (el1rm) el1rm.textContent = `${oneRepMax.toFixed(1)} kg`;
  if (elPower) elPower.textContent = `${p90.toFixed(1)} kg (1-3 reps)`;
  if (elHyper) elHyper.textContent = `${p80.toFixed(1)} kg (6-12 reps)`;
  if (elEndur) elEndur.textContent = `${p70.toFixed(1)} kg (12+ reps)`;
}

/* ============================================================
   10. BACKUP & RESTORE UTILITIES (NATIVE SHARE API / DOWNLOAD FALLBACK)
   ============================================================ */

async function shareBackupData() {
  fitnessData.lastBackup = dateToYYYYMMDD(new Date());
  saveData();
  renderNotes(); // Refresh label immediately

  // Wrap fitnessData and diet data together
  const exportData = JSON.parse(JSON.stringify(fitnessData));
  exportData._amanDietData = amanDietData;
  exportData._rishitDietData = rishitDietData;

  const dataStr = JSON.stringify(exportData, null, 2);
  
  // Generate filename: DuoGym_Backup_YYYY-MM-DD.json
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const filename = `DuoGym_Backup_${yyyy}-${mm}-${dd}.json`;

  // Native Android WebView sharing check
  if (typeof AndroidApp !== "undefined" && AndroidApp.shareBackup) {
    try {
      AndroidApp.shareBackup(dataStr, filename);
      return;
    } catch (e) {
      console.warn("AndroidApp.shareBackup failed, using browser share:", e);
    }
  }

  try {
    const file = new File([dataStr], filename, { type: "application/json" });
    
    // Check if Web Share API is available and can share file
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "DuoGym Backup",
        text: "Here is your DuoGym fitness and diet backup archive."
      });
    } else if (navigator.share) {
      // Fallback: share as raw text
      await navigator.share({
        title: "DuoGym Backup Archive",
        text: dataStr
      });
    } else {
      // Direct file download fallback
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.warn("Share failed, falling back to download:", err);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Click hidden file input
function triggerRestoreUpload() {
  DOM.get("backup-file-upload").click();
}

// Handle selected file parse and restore confirmation
function handleRestoreUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      
      // Validation check for primary structures
      if (parsed && (parsed.aman || parsed.rishit)) {
        if (confirm("Are you sure you want to restore this backup? This will overwrite your current workout, weight, and diet logs permanently.")) {
          // Extract diet data if packaged
          if (parsed._amanDietData) {
            amanDietData = parsed._amanDietData;
            safeStorage.setItem("amanDietData", JSON.stringify(amanDietData));
          }
          if (parsed._rishitDietData) {
            rishitDietData = parsed._rishitDietData;
            safeStorage.setItem("rishitDietData", JSON.stringify(rishitDietData));
          }
          
          // Clean diet fields from primary gym tracker object before saving
          delete parsed._amanDietData;
          delete parsed._rishitDietData;
          
          fitnessData = parsed;
          migrateDataIfNecessary(); // Formats backup in case it was old
          saveData();
          alert("Backup successfully restored!");
          window.location.reload(); // Reload site to refresh all DOM layouts
        }
      } else {
        alert("Invalid file format. The uploaded JSON file does not appear to be a valid Gym Tracker backup.");
      }
    } catch (err) {
      alert("Error reading file. Please make sure the uploaded file is a valid JSON database backup.");
      console.error(err);
    }
  };
  reader.readAsText(file);
  // Clear file input value to allow uploading the same file again
  event.target.value = "";
}

/* ============================================================
   10. PWA INSTALLATION PROMPT
   ============================================================ */
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Update UI to notify the user they can install the PWA
  const installBtn = DOM.get("install-app-btn");
  if (installBtn) {
    installBtn.style.display = "flex";
  }
});

function installApp() {
  if (!deferredPrompt) return;
  // Show the prompt
  deferredPrompt.prompt();
  // Wait for the user to respond to the prompt
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }
    deferredPrompt = null;
    const installBtn = DOM.get("install-app-btn");
    if (installBtn) {
      installBtn.style.display = "none";
    }
  });
}

window.addEventListener("appinstalled", (evt) => {
  console.log("App was successfully installed");
  const installBtn = DOM.get("install-app-btn");
  if (installBtn) {
    installBtn.style.display = "none";
  }
});


/* ============================================================
   10.5. SUMMARY PAGE STATS & AUXILIARY UTILITIES
   ============================================================ */

// Calculate streaks backwards from today/selectedDate
function calculateStreaks(user) {
  const start = new Date(START_DATE_STR);
  const realToday = new Date();
  
  // Bound realToday by END_DATE
  const end = new Date(END_DATE_STR);
  const todayBound = realToday > end ? end : realToday;
  
  const todayStr = dateToYYYYMMDD(todayBound);
  if (todayStr < START_DATE_STR) {
    return { currentStreak: 0, bestStreak: 0 };
  }
  
  let currentDate = new Date(start);
  const dates = [];
  
  while (dateToYYYYMMDD(currentDate) <= todayStr) {
    dates.push(dateToYYYYMMDD(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  
  // Calculate best streak
  for (let i = 0; i < dates.length; i++) {
    const dStr = dates[i];
    const isToday = (dStr === todayStr);
    const record = fitnessData[user].workouts[dStr];
    const completedCount = (record && record.completedExercises) ? record.completedExercises.length : 0;
    const isSunday = getWeekdayName(dStr) === "Sunday";
    
    let isSuccess = false;
    if (completedCount > 0 || isSunday) {
      isSuccess = true;
    }
    
    if (isToday) {
      if (isSuccess) {
        tempStreak++;
        if (tempStreak > bestStreak) {
          bestStreak = tempStreak;
        }
      }
    } else {
      if (isSuccess) {
        tempStreak++;
        if (tempStreak > bestStreak) {
          bestStreak = tempStreak;
        }
      } else {
        tempStreak = 0; // broken
      }
    }
  }
  
  // Calculate current streak
  let startIdx = dates.length - 1;
  const lastDate = dates[startIdx];
  const lastRecord = fitnessData[user].workouts[lastDate];
  const lastCompleted = (lastRecord && lastRecord.completedExercises) ? lastRecord.completedExercises.length : 0;
  const lastSunday = getWeekdayName(lastDate) === "Sunday";
  
  if (lastCompleted > 0 || lastSunday) {
    for (let i = startIdx; i >= 0; i--) {
      const dStr = dates[i];
      const rec = fitnessData[user].workouts[dStr];
      const comp = (rec && rec.completedExercises) ? rec.completedExercises.length : 0;
      const sun = getWeekdayName(dStr) === "Sunday";
      if (comp > 0 || sun) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else {
    // Today is pending, count from yesterday
    for (let i = startIdx - 1; i >= 0; i--) {
      const dStr = dates[i];
      const rec = fitnessData[user].workouts[dStr];
      const comp = (rec && rec.completedExercises) ? rec.completedExercises.length : 0;
      const sun = getWeekdayName(dStr) === "Sunday";
      if (comp > 0 || sun) {
        currentStreak++;
      } else {
        break;
      }
    }
  }
  
  return { currentStreak, bestStreak };
}

// Calculate workouts completed, missed, rest days, and completion percentage
function calculateWorkoutStats(user) {
  const start = new Date(START_DATE_STR);
  const realToday = new Date();
  
  const end = new Date(END_DATE_STR);
  const todayBound = realToday > end ? end : realToday;
  const todayStr = dateToYYYYMMDD(todayBound);
  
  if (todayStr < START_DATE_STR) {
    return { completed: 0, missed: 0, restDays: 0, percent: 0 };
  }
  
  let currentDate = new Date(start);
  let completed = 0;
  let missed = 0;
  let restDays = 0;
  
  while (dateToYYYYMMDD(currentDate) <= todayStr) {
    const dStr = dateToYYYYMMDD(currentDate);
    const isToday = (dStr === todayStr);
    const record = fitnessData[user].workouts[dStr];
    const completedCount = (record && record.completedExercises) ? record.completedExercises.length : 0;
    const isSunday = getWeekdayName(dStr) === "Sunday";
    
    if (isSunday) {
      restDays++;
    } else {
      if (completedCount > 0) {
        completed++;
      } else {
        if (!isToday) {
          missed++;
        }
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  const total = completed + missed;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { completed, missed, restDays, percent };
}

// Calculate weight changes month-over-month
function calculateMonthlyWeightChanges(user) {
  const startWeight = getStartingWeight(user);
  const weights = fitnessData[user].weights || {};
  
  const start = new Date(START_DATE_STR);
  const end = new Date(END_DATE_STR);
  const realToday = new Date();
  const todayBound = realToday > end ? end : realToday;
  
  const loggedDates = Object.keys(weights).sort();
  const months = [];
  
  let currentDate = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(todayBound.getFullYear(), todayBound.getMonth(), 1);
  
  while (currentDate <= endMonth) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const lastDayStr = dateToYYYYMMDD(lastDay > todayBound ? todayBound : lastDay);
    
    let activeWeight = startWeight;
    for (const dStr of loggedDates) {
      if (dStr <= lastDayStr) {
        activeWeight = weights[dStr];
      } else {
        break;
      }
    }
    
    months.push({
      label: currentDate.toLocaleDateString("en-US", { month: "long" }),
      year,
      month,
      weight: activeWeight
    });
    
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  const summary = [];
  if (months.length > 0) {
    const juneWeight = months[0].weight;
    const juneChange = juneWeight - startWeight;
    summary.push({ label: months[0].label, change: juneChange });
  }
  for (let i = 1; i < months.length; i++) {
    const prevWeight = months[i - 1].weight;
    const currWeight = months[i].weight;
    const change = currWeight - prevWeight;
    summary.push({ label: months[i].label, change });
  }
  return summary;
}



// Prompt Goal Weight configuration
function promptGoalWeight() {
  const currentGoal = fitnessData[currentUser].goalWeight || 80.0;
  const newGoalStr = prompt(`Enter new goal weight (kg) for ${currentUser.charAt(0).toUpperCase() + currentUser.slice(1)}:`, currentGoal);
  if (newGoalStr === null) return;
  const newGoal = parseFloat(newGoalStr);
  if (isNaN(newGoal) || newGoal <= 0 || newGoal > 300) {
    alert("Please enter a valid positive weight value.");
    return;
  }
  fitnessData[currentUser].goalWeight = newGoal;
  saveData();
}

// Toggle active exercise library muscle filter pills
let activeLibraryFilter = "all";
function setLibraryFilter(muscle) {
  activeLibraryFilter = muscle;
  const pills = document.querySelectorAll(".filter-pill");
  pills.forEach(p => {
    p.classList.toggle("active", p.textContent.trim().toLowerCase() === muscle.toLowerCase() || (muscle === "all" && p.textContent.trim() === "All"));
  });
  filterLibrary();
}

/* ============================================================
   10.8. DEVELOPER & FUTURE MAINTAINABILITY GUIDE
   ============================================================
   Welcome! Follow these simple guidelines to update this app.
   All modifications should be made directly in this script.js file.

   1. HOW TO CHANGE WORKOUT TYPES OR NAMES:
      Locate `weeklySchedule` configuration array around line 604. 
      Update the `type` or `focus` values of any weekday item.
      E.g., Change Monday's focus: `focus: "Chest, Back & Shoulders"`

   2. HOW TO ADD OR EDIT EXERCISES IN DATABASE:
      Locate `exerciseLibrary` configuration array around line 47.
      Add or edit an object with the following structure:
      {
        id: "unique-exercise-id",
        name: "Exercise Display Name",
        muscles: ["Chest", "Triceps"],
        description: "A short guide on what the exercise is...",
        steps: ["Step 1 description...", "Step 2 description..."],
        mistakes: ["Common mistake..."],
        breathing: "Breathing directions...",
        tips: ["Safety tip..."],
        restTime: "60-90 seconds",
        image: "https://unsplash.com/..."
      }

   3. HOW TO UPDATE WEEKLY SCHEDULE / ASSIGNED EXERCISES:
      Locate `weeklySchedule` configuration array around line 604.
      Under each day, update the `exercises` array by adding/removing
      exercise references matching the IDs inside the `exerciseLibrary`.
      E.g., `exercises: [ { exerciseId: "bench-press", reps: "8-12 reps", sets: 3 } ]`

   4. HOW TO EXTEND SUBSCRIPTION DATES:
      Locate `START_DATE_STR` and `END_DATE_STR` constants around line 695.
      Change the date string values in "YYYY-MM-DD" format.
      E.g., Extend end date: `const END_DATE_STR = "2028-12-31";`

   5. HOW TO ADD ANOTHER USER:
      Step A: Locate `STARTING_WEIGHTS` around line 698. Add a new key and weight:
              `const STARTING_WEIGHTS = { aman: 94.6, rishit: 92.7, newuser: 85.0 };`
      Step B: Locate `initData()` around line 789. Copy & append a new user block:
              `newuser: { workouts: {}, weights: { "2026-06-15": 85.0 }, notes: { general: "" }, measurements: {}, photos: {}, goalWeight: 75.0 }`
      Step C: In `index.html` (Header Section), copy the tab button markup:
              `<button id="tab-user-newuser" class="user-tab-btn" onclick="switchUser('newuser')">New User</button>`
   ============================================================ */

/* ============================================================
   12. DIET & CALORIE TRACKER MODULE LOGIC
   ============================================================ */

// Food database containing Indian, Bengali, and common daily foods with explicit portion weights and macros
const dietFoods = [
  // Beverages
  {n:"Chai (Tea) with Milk & Sugar",c:"Beverages",s:"1 cup (150ml)",w:150,k:120,p:2,carb:20,f:4},
  {n:"Chai (Tea) Black/No Sugar",c:"Beverages",s:"1 cup (150ml)",w:150,k:5,p:0.2,carb:1,f:0},
  {n:"Filter Coffee with Milk & Sugar",c:"Beverages",s:"1 cup (150ml)",w:150,k:110,p:2,carb:18,f:3.5},
  {n:"Coffee Black/No Sugar",c:"Beverages",s:"1 cup (150ml)",w:150,k:2,p:0.1,carb:0.4,f:0},
  {n:"Green Tea",c:"Beverages",s:"1 cup (150ml)",w:150,k:2,p:0,carb:0.5,f:0},
  {n:"Sweet Lassi",c:"Beverages",s:"1 glass (250ml)",w:250,k:200,p:5,carb:32,f:5},
  {n:"Salted Lassi",c:"Beverages",s:"1 glass (250ml)",w:250,k:120,p:4.5,carb:12,f:5},
  {n:"Masala Chaas (Buttermilk)",c:"Beverages",s:"1 glass (250ml)",w:250,k:45,p:2,carb:4,f:2},
  {n:"Coconut Water",c:"Beverages",s:"1 cup (200ml)",w:200,k:40,p:1,carb:9,f:0.2},
  {n:"Sugarcane Juice",c:"Beverages",s:"1 glass (250ml)",w:250,k:180,p:0.5,carb:45,f:0.1},
  {n:"Soft Drink (Cola/Soda)",c:"Beverages",s:"1 can (330ml)",w:330,k:140,p:0,carb:35,f:0},

  // Breakfast Items
  {n:"Poha",c:"Breakfast",s:"1 plate (150g)",w:150,k:260,p:4,carb:45,f:7},
  {n:"Suji Upma",c:"Breakfast",s:"1 plate (150g)",w:150,k:220,p:4,carb:34,f:7},
  {n:"Idli",c:"Breakfast",s:"2 medium pieces (80g)",w:80,k:150,p:4,carb:32,f:0.5},
  {n:"Plain Dosa",c:"Breakfast",s:"1 large (80g)",w:80,k:165,p:3,carb:29,f:4},
  {n:"Masala Dosa",c:"Breakfast",s:"1 large (150g)",w:150,k:290,p:6,carb:48,f:8},
  {n:"Medu Vada",c:"Breakfast",s:"2 pieces (80g)",w:80,k:190,p:5,carb:18,f:11},
  {n:"Sambar",c:"Breakfast",s:"1 bowl (150g)",w:150,k:85,p:3,carb:14,f:2},
  {n:"Coconut Chutney",c:"Breakfast",s:"2 tbsp (30g)",w:30,k:90,p:1,carb:4,f:8},
  {n:"Aloo Paratha",c:"Breakfast",s:"1 medium (100g)",w:100,k:290,p:6,carb:42,f:11},
  {n:"Paneer Paratha",c:"Breakfast",s:"1 medium (100g)",w:100,k:330,p:12,carb:38,f:14},
  {n:"Gobhi Paratha",c:"Breakfast",s:"1 medium (100g)",w:100,k:240,p:5,carb:36,f:8},
  {n:"Puri Bhaji",c:"Breakfast",s:"2 puri + bhaji (180g)",w:180,k:380,p:7,carb:48,f:18},
  {n:"Chole Bhature",c:"Breakfast",s:"1 plate (220g)",w:220,k:550,p:12,carb:70,f:24},
  {n:"Dhokla",c:"Breakfast",s:"2 pieces (80g)",w:80,k:130,p:6,carb:18,f:4},
  {n:"Khandvi",c:"Breakfast",s:"4 pieces (100g)",w:100,k:140,p:4,carb:16,f:6},
  {n:"Moong Dal Cheela",c:"Breakfast",s:"2 medium (100g)",w:100,k:190,p:12,carb:28,f:3},
  {n:"Besan Cheela",c:"Breakfast",s:"2 medium (100g)",w:100,k:210,p:10,carb:30,f:5},
  {n:"Oatmeal with Milk",c:"Breakfast",s:"1 bowl (200g)",w:200,k:260,p:10,carb:42,f:5},
  {n:"Boiled Egg",c:"Breakfast",s:"1 large (50g)",w:50,k:78,p:6,carb:0.6,f:5},
  {n:"Omelette (2 Eggs, Plain)",c:"Breakfast",s:"1 plate (100g)",w:100,k:180,p:12,carb:1,f:14},
  {n:"Egg Bhurji (2 Eggs)",c:"Breakfast",s:"1 plate (120g)",w:120,k:220,p:14,carb:3,f:17},
  {n:"Whey Protein",c:"Breakfast",s:"1 scoop (33g)",w:33,k:120,p:24,carb:3,f:1.5},

  // Rice & Pulao
  {n:"Plain White Rice (Cooked)",c:"Rice",s:"1 bowl (150g)",w:150,k:195,p:4,carb:43,f:0.5},
  {n:"Brown Rice (Cooked)",c:"Rice",s:"1 bowl (150g)",w:150,k:170,p:4,carb:35,f:1.5},
  {n:"Jeera Rice",c:"Rice",s:"1 bowl (150g)",w:150,k:210,p:4.2,carb:42,f:2.5},
  {n:"Khichdi (Moong Dal & Rice)",c:"Rice",s:"1 bowl (150g)",w:150,k:215,p:7,carb:38,f:3},
  {n:"Veg Biryani",c:"Rice",s:"1 plate (250g)",w:250,k:350,p:8,carb:62,f:8},
  {n:"Chicken Biryani",c:"Rice",s:"1 plate (250g)",w:250,k:480,p:28,carb:58,f:15},
  {n:"Curd Rice",c:"Rice",s:"1 bowl (200g)",w:200,k:220,p:5,carb:35,f:6},

  // Breads
  {n:"Roti (Whole Wheat, Plain)",c:"Bread",s:"1 medium (40g)",w:40,k:100,p:3,carb:20,f:0.5},
  {n:"Butter Roti",c:"Bread",s:"1 medium (45g)",w:45,k:130,p:3,carb:20,f:4},
  {n:"Tandoori Roti (Plain)",c:"Bread",s:"1 piece (60g)",w:60,k:150,p:4.5,carb:31,f:0.6},
  {n:"Plain Naan",c:"Bread",s:"1 piece (90g)",w:90,k:260,p:6.5,carb:52,f:3},
  {n:"Butter Naan",c:"Bread",s:"1 piece (95g)",w:95,k:310,p:6.5,carb:52,f:8.5},
  {n:"Garlic Naan",c:"Bread",s:"1 piece (95g)",w:95,k:320,p:7,carb:53,f:9},
  {n:"Missi Roti",c:"Bread",s:"1 piece (60g)",w:60,k:145,p:6,carb:24,f:3},
  {n:"Bajra Roti",c:"Bread",s:"1 piece (50g)",w:50,k:120,p:3.5,carb:25,f:1},
  {n:"White Bread",c:"Bread",s:"1 slice (25g)",w:25,k:65,p:2,carb:13,f:0.5},
  {n:"Brown Bread",c:"Bread",s:"1 slice (28g)",w:28,k:70,p:3,carb:13,f:0.8},

  // Dals & Soups
  {n:"Dal Tadka (Yellow Dal)",c:"Dal",s:"1 bowl (150g)",w:150,k:150,p:7,carb:20,f:4},
  {n:"Dal Makhani",c:"Dal",s:"1 bowl (150g)",w:150,k:240,p:8,carb:22,f:13},
  {n:"Chana Masala (Chickpeas)",c:"Dal",s:"1 bowl (150g)",w:150,k:180,p:8,carb:28,f:4},
  {n:"Rajma Masala (Kidney Beans)",c:"Dal",s:"1 bowl (150g)",w:150,k:190,p:9,carb:30,f:4},
  {n:"Shorba / Lentil Soup",c:"Dal",s:"1 bowl (200ml)",w:200,k:110,p:6,carb:18,f:2},
  {n:"Tomato Soup",c:"Dal",s:"1 bowl (200ml)",w:200,k:80,p:1.5,carb:12,f:3},

  // Vegetables & Paneer
  {n:"Mixed Veg Sabzi",c:"Veg Dishes",s:"1 bowl (150g)",w:150,k:110,p:3,carb:15,f:5},
  {n:"Bhindi Masala (Okra)",c:"Veg Dishes",s:"1 bowl (150g)",w:150,k:130,p:3,carb:12,f:8},
  {n:"Aloo Gobhi",c:"Veg Dishes",s:"1 bowl (150g)",w:150,k:150,p:3,carb:18,f:8},
  {n:"Baingan Bharta",c:"Veg Dishes",s:"1 bowl (150g)",w:150,k:120,p:2,carb:14,f:6},
  {n:"Paneer Butter Masala",c:"Paneer",s:"1 bowl (150g)",w:150,k:320,p:12,carb:10,f:26},
  {n:"Palak Paneer",c:"Paneer",s:"1 bowl (150g)",w:150,k:210,p:10,carb:8,f:15},
  {n:"Kadai Paneer",c:"Paneer",s:"1 bowl (150g)",w:150,k:260,p:11,carb:9,f:20},
  {n:"Paneer Bhurji",c:"Paneer",s:"1 serving (150g)",w:150,k:270,p:14,carb:6,f:21},
  {n:"Paneer Tikka (Grilled)",c:"Paneer",s:"6 pieces (150g)",w:150,k:270,p:18,carb:6,f:20},
  {n:"Raw Paneer",c:"Paneer",s:"50g portion",w:50,k:165,p:10,carb:1,f:13},

  // Non-Veg Curries
  {n:"Chicken Curry (Indian style)",c:"Non-Veg",s:"1 bowl (150g)",w:150,k:240,p:22,carb:6,f:14},
  {n:"Butter Chicken",c:"Non-Veg",s:"1 bowl (150g)",w:150,k:380,p:24,carb:12,f:26},
  {n:"Chicken Tikka",c:"Non-Veg",s:"6 pieces (150g)",w:150,k:220,p:30,carb:4,f:8},
  {n:"Fish Curry (Indian style)",c:"Non-Veg",s:"1 bowl (180g)",w:180,k:210,p:20,carb:5,f:12},
  {n:"Egg Curry (2 Eggs)",c:"Non-Veg",s:"1 bowl (180g)",w:180,k:260,p:14,carb:8,f:19},
  {n:"Mutton Curry",c:"Non-Veg",s:"1 bowl (180g)",w:180,k:340,p:26,carb:8,f:22},

  // Dairy & Sides
  {n:"Dahi / Curd (Whole Milk)",c:"Dairy",s:"1 bowl (150g)",w:150,k:100,p:5,carb:6,f:6},
  {n:"Dahi / Curd (Double Toned)",c:"Dairy",s:"1 bowl (150g)",w:150,k:60,p:6,carb:7,f:0.2},
  {n:"Cow Milk (Toned)",c:"Dairy",s:"1 glass (250ml)",w:250,k:120,p:8,carb:12,f:4.5},
  {n:"Cow Milk (Full Cream)",c:"Dairy",s:"1 glass (250ml)",w:250,k:160,p:8.2,carb:12.5,f:8.5},
  {n:"Amul Butter",c:"Dairy",s:"1 pat (10g)",w:10,k:72,p:0.1,carb:0,f:8},
  {n:"Ghee (Clarified Butter)",c:"Dairy",s:"1 tsp (5ml)",w:5,k:45,p:0,carb:0,f:5},

  // Snacks & Street Foods
  {n:"Samosa",c:"Snacks",s:"1 medium (70g)",w:70,k:250,p:4,carb:25,f:15},
  {n:"Pakora (Veg Mix)",c:"Snacks",s:"4 pieces (80g)",w:80,k:280,p:5,carb:25,f:18},
  {n:"Panipuri / Golgappa",c:"Snacks",s:"6 pieces (100g)",w:100,k:150,p:3,carb:26,f:4},
  {n:"Pav Bhaji",c:"Snacks",s:"1 plate (200g)",w:200,k:400,p:9,carb:58,f:14},
  {n:"Vada Pav",c:"Snacks",s:"1 piece (120g)",w:120,k:300,p:6,carb:40,f:12},
  {n:"Bhelpuri",c:"Snacks",s:"1 plate (100g)",w:100,k:180,p:4,carb:32,f:4},
  {n:"Sev Puri",c:"Snacks",s:"6 pieces (120g)",w:120,k:310,p:6,carb:42,f:13},
  {n:"Papdi Chaat",c:"Snacks",s:"1 plate (150g)",w:150,k:340,p:7,carb:42,f:16},
  {n:"Veg Momos (Steamed)",c:"Snacks",s:"6 pieces (120g)",w:120,k:220,p:6,carb:42,f:3},
  {n:"Veg Roll",c:"Snacks",s:"1 roll (150g)",w:150,k:320,p:8,carb:48,f:11},
  {n:"Paneer Roll",c:"Snacks",s:"1 roll (160g)",w:160,k:390,p:15,carb:50,f:15},
  {n:"Maggie Noodles",c:"Snacks",s:"1 bowl (150g cooked)",w:150,k:310,p:7,carb:44,f:12},
  {n:"Roasted Makhana (Foxnuts)",c:"Snacks",s:"1 bowl (20g)",w:20,k:75,p:2,carb:15,f:0.1},
  {n:"Roasted Chana (Gram)",c:"Snacks",s:"1 handful (30g)",w:30,k:110,p:6,carb:18,f:1.5},
  {n:"Almonds",c:"Snacks",s:"10 pieces (10g)",w:10,k:60,p:2.2,carb:2.2,f:5},
  {n:"Peanut Butter",c:"Snacks",s:"1 tbsp (16g)",w:16,k:95,p:4,carb:3,f:8},

  // Sweets & Desserts
  {n:"Gulab Jamun",c:"Sweets",s:"2 pieces (80g)",w:80,k:300,p:4,carb:50,f:10},
  {n:"Jalebi",c:"Sweets",s:"2 pieces (60g)",w:60,k:220,p:1,carb:38,f:7},
  {n:"Rasgulla",c:"Sweets",s:"2 pieces (80g)",w:80,k:200,p:4,carb:38,f:3},
  {n:"Kaju Katli",c:"Sweets",s:"2 pieces (30g)",w:30,k:120,p:2,carb:16,f:6},
  {n:"Besan Ladoo",c:"Sweets",s:"1 piece (40g)",w:40,k:200,p:3,carb:24,f:10},
  {n:"Motichoor Ladoo",c:"Sweets",s:"1 piece (40g)",w:40,k:185,p:2,carb:26,f:8},
  {n:"Rasmalai",c:"Sweets",s:"1 piece (80g)",w:80,k:160,p:5,carb:22,f:6},
  {n:"Kheer (Rice Pudding)",c:"Sweets",s:"1 bowl (150g)",w:150,k:240,p:6,carb:38,f:7},
  {n:"Gajar Halwa",c:"Sweets",s:"1 bowl (150g)",w:150,k:380,p:6,carb:52,f:16},

  // Fruits
  {n:"Banana",c:"Fruits",s:"1 medium (110g)",w:110,k:95,p:1.2,carb:25,f:0.3},
  {n:"Apple",c:"Fruits",s:"1 medium (150g)",w:150,k:80,p:0.3,carb:20,f:0.2},
  {n:"Papaya",c:"Fruits",s:"1 cup diced (145g)",w:145,k:60,p:0.6,carb:15,f:0.1},
  {n:"Mango",c:"Fruits",s:"1 medium (200g)",w:200,k:130,p:1.6,carb:34,f:0.6},
  {n:"Watermelon",c:"Fruits",s:"1 cup diced (150g)",w:150,k:46,p:0.9,carb:11,f:0.2}
];

// Default preset diet plan mapping (Fat-loss base plan)
const defaultPresetDiet = {
  Breakfast: [
    { n: "Poha", c: "Breakfast", s: "150g portion (1 plate)", k: 260, p: 4, carb: 45, f: 7 },
    { n: "Banana", c: "Fruits", s: "110g portion (1 medium)", k: 95, p: 1.2, carb: 25, f: 0.3 },
    { n: "Chai (Tea) with Milk & Sugar", c: "Beverages", s: "150ml portion (1 cup)", k: 120, p: 2, carb: 20, f: 4 }
  ],
  Lunch: [
    { n: "Plain White Rice (Cooked)", c: "Rice", s: "150g portion (1 bowl)", k: 195, p: 4, carb: 43, f: 0.5 },
    { n: "Dal Tadka (Yellow Dal)", c: "Dal", s: "150g portion (1 bowl)", k: 150, p: 7, carb: 20, f: 4 },
    { n: "Mixed Veg Sabzi", c: "Veg Dishes", s: "150g portion (1 bowl)", k: 110, p: 3, carb: 15, f: 5 }
  ],
  EveningSnacks: [
    { n: "Roasted Chana (Gram)", c: "Snacks", s: "30g portion (1 handful)", k: 110, p: 6, carb: 18, f: 1.5 }
  ],
  Dinner: [
    { n: "Roti (Whole Wheat, Plain)", c: "Bread", s: "120g portion (3 medium)", k: 300, p: 9, carb: 60, f: 1.5 },
    { n: "Paneer Bhurji", c: "Paneer", s: "150g portion (1 plate)", k: 270, p: 14, carb: 6, f: 21 },
    { n: "Cow Milk (Toned)", c: "Dairy", s: "250ml portion (1 glass)", k: 120, p: 8, carb: 12, f: 4.5 }
  ]
};

// Default 7-day weekly schedule for Aman
const defaultWeeklyScheduleAman = {
  Monday: JSON.parse(JSON.stringify(defaultPresetDiet)),
  Tuesday: JSON.parse(JSON.stringify(defaultPresetDiet)),
  Wednesday: JSON.parse(JSON.stringify(defaultPresetDiet)),
  Thursday: JSON.parse(JSON.stringify(defaultPresetDiet)),
  Friday: JSON.parse(JSON.stringify(defaultPresetDiet)),
  Saturday: JSON.parse(JSON.stringify(defaultPresetDiet)),
  Sunday: JSON.parse(JSON.stringify(defaultPresetDiet))
};

// Default 7-day weekly schedule for Rishit (Aman's + portion adjustment)
const defaultWeeklyScheduleRishit = JSON.parse(JSON.stringify(defaultWeeklyScheduleAman));
Object.keys(defaultWeeklyScheduleRishit).forEach(day => {
  const dayPlan = defaultWeeklyScheduleRishit[day];
  dayPlan.Breakfast = [
    { n: "Poha", c: "Breakfast", s: "200g portion (1.3 plates)", k: 346, p: 5.3, carb: 60, f: 9.3 },
    { n: "Banana", c: "Fruits", s: "110g portion (1 medium)", k: 95, p: 1.2, carb: 25, f: 0.3 },
    { n: "Filter Coffee with Milk & Sugar", c: "Beverages", s: "150ml portion (1 cup)", k: 110, p: 2, carb: 18, f: 3.5 }
  ];
  dayPlan.Lunch = [
    { n: "Plain White Rice (Cooked)", c: "Rice", s: "200g portion (1.3 bowls)", k: 260, p: 5.3, carb: 57, f: 0.7 },
    { n: "Dal Tadka (Yellow Dal)", c: "Dal", s: "150g portion (1 bowl)", k: 150, p: 7, carb: 20, f: 4 },
    { n: "Mixed Veg Sabzi", c: "Veg Dishes", s: "150g portion (1 bowl)", k: 110, p: 3, carb: 15, f: 5 }
  ];
  dayPlan.EveningSnacks = [
    { n: "Roasted Chana (Gram)", c: "Snacks", s: "40g portion (1.3 handfuls)", k: 150, p: 8, carb: 24, f: 2 }
  ];
  dayPlan.Dinner = [
    { n: "Roti (Whole Wheat, Plain)", c: "Bread", s: "160g portion (4 medium)", k: 400, p: 12, carb: 80, f: 2 },
    { n: "Paneer Bhurji", c: "Paneer", s: "200g portion (1.3 plates)", k: 360, p: 18.7, carb: 8, f: 28 },
    { n: "Cow Milk (Toned)", c: "Dairy", s: "250ml portion (1 glass)", k: 120, p: 8, carb: 12, f: 4.5 }
  ];
});

// State variables for Diet Tracker
let amanDietData = null;
let rishitDietData = null;
let selectedDietDate = "";
let activeDietTab = "log"; // log, schedule, profile, reports
let dietSearchPage = 1;
const dietSearchPageSize = 8;
let activeLoggingMeal = "";
let selectedDietCategory = "";

// Macro Calculation Helper: estimates P/C/F based on food categories and calories
function getFoodMacros(food) {
  // Check if exact macros are defined on the food object
  const hasExact = (food.p !== undefined || food.protein !== undefined) && 
                    (food.carb !== undefined || food.carbs !== undefined) && 
                    (food.f !== undefined || food.fat !== undefined);
  if (hasExact) {
    return {
      protein: Math.round(food.p !== undefined ? food.p : (food.protein || 0)),
      carbs: Math.round(food.carb !== undefined ? food.carb : (food.carbs || 0)),
      fat: Math.round(food.f !== undefined ? food.f : (food.fat || 0))
    };
  }
  
  let p = 0, c = 0, f = 0;
  const kcal = food.k || food.calories || 0;
  const cat = food.c || food.category || "";
  
  switch(cat) {
    case "Breakfast":
      p = Math.round((kcal * 0.15) / 4);
      c = Math.round((kcal * 0.60) / 4);
      f = Math.round((kcal * 0.25) / 9);
      break;
    case "Rice":
    case "Bread":
      p = Math.round((kcal * 0.08) / 4);
      c = Math.round((kcal * 0.85) / 4);
      f = Math.round((kcal * 0.07) / 9);
      break;
    case "Dal":
    case "Legumes":
      p = Math.round((kcal * 0.25) / 4);
      c = Math.round((kcal * 0.65) / 4);
      f = Math.round((kcal * 0.10) / 9);
      break;
    case "Paneer":
      p = Math.round((kcal * 0.25) / 4);
      c = Math.round((kcal * 0.15) / 4);
      f = Math.round((kcal * 0.60) / 9);
      break;
    case "Soybean":
      p = Math.round((kcal * 0.40) / 4);
      c = Math.round((kcal * 0.35) / 4);
      f = Math.round((kcal * 0.25) / 9);
      break;
    case "Bengali Sabji":
    case "Dry Veg":
    case "Veg Dishes":
    case "Salads":
    case "Soups":
      p = Math.round((kcal * 0.10) / 4);
      c = Math.round((kcal * 0.70) / 4);
      f = Math.round((kcal * 0.20) / 9);
      break;
    case "Fruits":
      p = Math.round((kcal * 0.03) / 4);
      c = Math.round((kcal * 0.95) / 4);
      f = Math.round((kcal * 0.02) / 9);
      break;
    case "Snacks":
    case "Street Food":
      p = Math.round((kcal * 0.08) / 4);
      c = Math.round((kcal * 0.52) / 4);
      f = Math.round((kcal * 0.40) / 9);
      break;
    case "Bengali Sweets":
    case "Desserts":
    case "Sweets":
      p = Math.round((kcal * 0.05) / 4);
      c = Math.round((kcal * 0.75) / 4);
      f = Math.round((kcal * 0.20) / 9);
      break;
    default:
      p = Math.round((kcal * 0.15) / 4);
      c = Math.round((kcal * 0.55) / 4);
      f = Math.round((kcal * 0.30) / 9);
  }
  
  // Minimal carbohydrate assignment if calorie value exists but formula estimates zero
  if (kcal > 0 && p === 0 && c === 0 && f === 0) {
    c = Math.round(kcal / 4);
  }
  return { protein: p, carbs: c, fat: f };
}

function getDietDateAggregates(data, username, dateStr) {
  const cacheKey = `${username}_${dateStr}`;
  if (dietAggregatesCache[cacheKey]) {
    return dietAggregatesCache[cacheKey];
  }
  
  ensureDietDateRecord(data, dateStr);
  const meals = data.meals[dateStr];
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  
  ["Breakfast", "Lunch", "EveningSnacks", "Dinner"].forEach(type => {
    (meals[type] || []).forEach(f => {
      calories += f.k;
      const mac = getFoodMacros(f);
      protein += mac.protein;
      carbs += mac.carbs;
      fat += mac.fat;
    });
  });
  
  const result = { calories, protein, carbs, fat };
  dietAggregatesCache[cacheKey] = result;
  return result;
}

function getCachedStreaks(username) {
  if (streaksCache[username]) {
    return streaksCache[username];
  }
  const result = calculateStreaks(username);
  streaksCache[username] = result;
  return result;
}

function getCachedActivityStreaks(username) {
  if (activityStreaksCache[username]) {
    return activityStreaksCache[username];
  }
  const result = calculateActivityStreaks(username);
  activityStreaksCache[username] = result;
  return result;
}

// Automatic migration utility to update legacy schedules to dietician plan
function migrateDietDataIfNecessary(data, user) {
  let migrated = false;
  const isAman = (user === "aman");
  
  if (!data.profile) {
    data.profile = {
      age: isAman ? 24 : 18,
      height: 170,
      weight: isAman ? 94.6 : 92.7,
      goalWeight: 80,
      targetCalories: isAman ? 2200 : 2300
    };
    migrated = true;
  } else {
    // Ensure all critical profile properties exist defensively
    if (data.profile.age === undefined) { data.profile.age = isAman ? 24 : 18; migrated = true; }
    if (data.profile.height === undefined) { data.profile.height = 170; migrated = true; }
    if (data.profile.weight === undefined) { data.profile.weight = isAman ? 94.6 : 92.7; migrated = true; }
    if (data.profile.goalWeight === undefined) { data.profile.goalWeight = 80; migrated = true; }
    if (data.profile.targetCalories === undefined) { data.profile.targetCalories = isAman ? 2200 : 2300; migrated = true; }
  }
  
  if (!data.schedule) {
    data.schedule = JSON.parse(JSON.stringify(isAman ? defaultWeeklyScheduleAman : defaultWeeklyScheduleRishit));
    migrated = true;
  }

  if (!data.meals) {
    data.meals = {};
    migrated = true;
  }
  
  return migrated;
}

// Initial default structures generator
function initDietData(user) {
  const isAman = (user === "aman");
  return {
    profile: {
      age: isAman ? 24 : 18,
      height: 170,
      weight: isAman ? 94.6 : 92.7,
      goalWeight: 80,
      targetCalories: isAman ? 2200 : 2300
    },
    meals: {}, // date -> { Breakfast: [], Lunch: [], EveningSnacks: [], Dinner: [] }
    schedule: JSON.parse(JSON.stringify(isAman ? defaultWeeklyScheduleAman : defaultWeeklyScheduleRishit))
  };
}

// Load separate databases from localStorage
function loadDietData() {
  const storedAman = safeStorage.getItem("amanDietData");
  if (storedAman) {
    try { 
      amanDietData = JSON.parse(storedAman);
      if (migrateDietDataIfNecessary(amanDietData, "aman")) {
        safeStorage.setItem("amanDietData", JSON.stringify(amanDietData));
      }
    }
    catch(e) { amanDietData = initDietData("aman"); }
  } else {
    amanDietData = initDietData("aman");
  }

  const storedRishit = safeStorage.getItem("rishitDietData");
  if (storedRishit) {
    try { 
      rishitDietData = JSON.parse(storedRishit);
      if (migrateDietDataIfNecessary(rishitDietData, "rishit")) {
        safeStorage.setItem("rishitDietData", JSON.stringify(rishitDietData));
      }
    }
    catch(e) { rishitDietData = initDietData("rishit"); }
  } else {
    rishitDietData = initDietData("rishit");
  }

  // Set version flag so migration doesn't run again next time
  safeStorage.setItem("duogym_diet_version_dietician_v2", "true");
}

// Save back to respective separate keys
let customDietData = {}; // Cache for custom users' diet data

function getActiveDietData() {
  if (currentUser === "aman") return amanDietData;
  if (currentUser === "rishit") return rishitDietData;
  if (!customDietData[currentUser]) {
    const stored = safeStorage.getItem(`${currentUser}_diet_data`);
    if (stored) {
      try {
        customDietData[currentUser] = JSON.parse(stored);
        migrateDietDataIfNecessary(customDietData[currentUser], currentUser);
      } catch (e) {
        customDietData[currentUser] = initDietData(currentUser);
      }
    } else {
      customDietData[currentUser] = initDietData(currentUser);
    }
  }
  return customDietData[currentUser];
}

function saveDietData() {
  invalidateDietCache(currentUser);
  if (currentUser === "aman") {
    safeStorage.setItem("amanDietData", JSON.stringify(amanDietData));
  } else if (currentUser === "rishit") {
    safeStorage.setItem("rishitDietData", JSON.stringify(rishitDietData));
  } else {
    const data = getActiveDietData();
    safeStorage.setItem(`${currentUser}_diet_data`, JSON.stringify(data));
  }
  if (typeof debouncedSync === 'function') debouncedSync();
}

function saveDietDataDirect(username, data) {
  invalidateDietCache(username);
  if (username === "aman") {
    amanDietData = data;
    safeStorage.setItem("amanDietData", JSON.stringify(amanDietData));
  } else if (username === "rishit") {
    rishitDietData = data;
    safeStorage.setItem("rishitDietData", JSON.stringify(rishitDietData));
  } else {
    customDietData[username] = data;
    safeStorage.setItem(`${username}_diet_data`, JSON.stringify(data));
  }
}

// Ensure meal arrays exist for a selected date
function ensureDietDateRecord(data, dateStr) {
  if (!data.meals[dateStr]) {
    data.meals[dateStr] = {
      Breakfast: [],
      Lunch: [],
      EveningSnacks: [],
      Dinner: []
    };
  }
}

// Main page switch renderer entry point
function renderDietTracker() {
  if (activePage !== "diet") return;
  if (!selectedDietDate) {
    selectedDietDate = selectedDate; // Sync with calendar date context
  }
  
  // Switch Sub-tabs content show/hide
  const panels = ["log", "schedule", "profile", "reports"];
  panels.forEach(p => {
    const el = DOM.get(`diet-panel-${p}`);
    if (el) el.style.display = (p === activeDietTab) ? "block" : "none";
    
    const btn = DOM.get(`diet-tab-btn-${p}`);
    if (btn) btn.classList.toggle("active", p === activeDietTab);
  });

  // Route inner renders
  if (activeDietTab === "log") {
    renderDietLog();
  } else if (activeDietTab === "schedule") {
    renderWeeklySchedule();
  } else if (activeDietTab === "profile") {
    renderDietProfile();
  } else if (activeDietTab === "reports") {
    renderDietReports();
  }
}

// Tab switcher handler
function switchDietTab(tabId) {
  activeDietTab = tabId;
  renderDietTracker();
}

// ── RENDER SUB-TAB 1: DAILY LOG ──
function renderDietLog() {
  const data = getActiveDietData();
  ensureDietDateRecord(data, selectedDietDate);
  
  // Date values
  DOM.get("diet-date-text").textContent = formatDateNav(selectedDietDate);
  DOM.get("diet-date-picker").value = selectedDietDate;
  
  const targetCals = data.profile.targetCalories || 2000;
  DOM.get("diet-val-target").textContent = targetCals;
  
  // Compute logged items
  const meals = data.meals[selectedDietDate];
  const aggregates = getDietDateAggregates(data, currentUser, selectedDietDate);
  const consumedCals = aggregates.calories;
  const totalProtein = aggregates.protein;
  const totalCarbs = aggregates.carbs;
  const totalFat = aggregates.fat;

  const mealTypes = ["Breakfast", "Lunch", "EveningSnacks", "Dinner"];
  
  mealTypes.forEach(type => {
    const listContainer = DOM.get(type === "EveningSnacks" ? "meal-list-snacks" : `meal-list-${type.toLowerCase()}`);
    const calLabel = DOM.get(type === "EveningSnacks" ? "meal-cal-snacks" : `meal-cal-${type.toLowerCase()}`);
    
    if (!listContainer) return;
    listContainer.innerHTML = "";
    
    let mealCals = 0;
    const items = meals[type] || [];
    
    if (items.length === 0) {
      listContainer.innerHTML = `<div class="meal-placeholder">No foods logged</div>`;
    } else {
      items.forEach((food, idx) => {
        mealCals += food.k;
        
        // Accumulate macros
        const macros = getFoodMacros(food);
        
        const row = document.createElement("div");
        row.className = "meal-food-item";
        row.innerHTML = `
          <div class="meal-food-info">
            <span class="meal-food-name">${food.n}</span>
            <span class="meal-food-sub">${food.s} • P: ${macros.protein}g C: ${macros.carbs}g F: ${macros.fat}g</span>
          </div>
          <div class="meal-food-right">
            <span class="meal-food-calories">${food.k} kcal</span>
            <button class="btn-delete-food" onclick="deleteFoodItem('${type}', ${idx})" title="Remove item">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        `;
        listContainer.appendChild(row);
      });
    }
    
    if (calLabel) calLabel.textContent = `${mealCals} kcal`;
  });

  // Update summary totals
  DOM.get("diet-val-consumed").textContent = consumedCals;
  
  const remainingCals = targetCals - consumedCals;
  const remainingLabel = DOM.get("diet-val-remaining");
  const remainingStatus = DOM.get("diet-status-remaining");
  
  if (remainingCals >= 0) {
    remainingLabel.textContent = `${remainingCals} kcal`;
    remainingLabel.style.color = "var(--text-main)";
    remainingStatus.textContent = "Remaining";
    remainingStatus.style.color = "var(--text-sub)";
  } else {
    remainingLabel.textContent = `${Math.abs(remainingCals)} kcal`;
    remainingLabel.style.color = "var(--danger)";
    remainingStatus.textContent = "Over budget";
    remainingStatus.style.color = "var(--danger)";
  }

  const pct = Math.min(100, Math.round((consumedCals / targetCals) * 100));
  
  // Progress fill width
  const progressFill = DOM.get("diet-progress-fill");
  if (progressFill) {
    progressFill.style.width = `${pct}%`;
    progressFill.style.background = (consumedCals > targetCals) ? "var(--danger)" : "var(--accent)";
  }

  // Macro progress totals calculated dynamically (Protein: 25%, Carbs: 50%, Fat: 25%)
  const targetProtein = Math.round((targetCals * 0.25) / 4);
  const targetCarbs = Math.round((targetCals * 0.50) / 4);
  const targetFat = Math.round((targetCals * 0.25) / 9);

  DOM.get("diet-protein-total").textContent = `${Math.round(totalProtein)} / ${targetProtein}g`;
  DOM.get("diet-carbs-total").textContent = `${Math.round(totalCarbs)} / ${targetCarbs}g`;
  DOM.get("diet-fat-total").textContent = `${Math.round(totalFat)} / ${targetFat}g`;

  // Refresh lucide icons inside logs
  safeCreateIcons();
  renderPremiumStatsStrip();
}

// Delete food entry from log
function deleteFoodItem(type, index) {
  const data = getActiveDietData();
  
  if (activeDietTab === "log") {
    data.meals[selectedDietDate][type].splice(index, 1);
  } else if (activeDietTab === "schedule") {
    const day = DOM.get("diet-sched-day-select").value;
    data.schedule[day][type].splice(index, 1);
  }
  
  saveDietData();
  renderDietTracker();
}

// Date Navigation Controls
function adjustDietDate(days) {
  const current = new Date(selectedDietDate);
  current.setDate(current.getDate() + days);
  const dateStr = dateToYYYYMMDD(current);
  if (isWithinSubscription(dateStr)) {
    selectedDietDate = dateStr;
    renderDietTracker();
  }
}

function onDietDateChanged(newVal) {
  if (isWithinSubscription(newVal)) {
    selectedDietDate = newVal;
    renderDietTracker();
  } else {
    alert("Date selected is outside subscription period!");
    DOM.get("diet-date-picker").value = selectedDietDate;
  }
}

// ── RENDER SUB-TAB 2: WEEKLY SCHEDULE ──
function renderWeeklySchedule() {
  const data = getActiveDietData();
  const day = DOM.get("diet-sched-day-select").value;
  
  const schedule = data.schedule[day];
  const mealTypes = ["Breakfast", "Lunch", "EveningSnacks", "Dinner"];
  
  mealTypes.forEach(type => {
    const listContainer = DOM.get(type === "EveningSnacks" ? "sched-list-snacks" : `sched-list-${type.toLowerCase()}`);
    const calLabel = DOM.get(type === "EveningSnacks" ? "sched-cal-snacks" : `sched-cal-${type.toLowerCase()}`);
    
    if (!listContainer) return;
    listContainer.innerHTML = "";
    
    let mealCals = 0;
    const items = schedule[type] || [];
    
    if (items.length === 0) {
      listContainer.innerHTML = `<div class="meal-placeholder">No foods scheduled</div>`;
    } else {
      items.forEach((food, idx) => {
        mealCals += food.k;
        const macros = getFoodMacros(food);
        
        const row = document.createElement("div");
        row.className = "meal-food-item";
        row.innerHTML = `
          <div class="meal-food-info">
            <span class="meal-food-name">${food.n}</span>
            <span class="meal-food-sub">${food.s} • P: ${macros.protein}g C: ${macros.carbs}g F: ${macros.fat}g</span>
          </div>
          <div class="meal-food-right">
            <span class="meal-food-calories">${food.k} kcal</span>
            <button class="btn-delete-food" onclick="deleteFoodItem('${type}', ${idx})" title="Remove item">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        `;
        listContainer.appendChild(row);
      });
    }
    if (calLabel) calLabel.textContent = `${mealCals} kcal`;
  });
  
  safeCreateIcons();
}

// ── RENDER SUB-TAB 3: DIET PROFILE ──
function renderDietProfile() {
  const data = getActiveDietData();
  
  // Fetch latest weight dynamically from weights registry
  const weights = fitnessData[currentUser].weights || {};
  const dates = Object.keys(weights).sort();
  const latestWeight = dates.length ? weights[dates[dates.length - 1]] : data.profile.weight;
  
  DOM.get("diet-prof-age").value = data.profile.age;
  DOM.get("diet-prof-height").value = data.profile.height;
  DOM.get("diet-prof-weight").value = latestWeight;
  DOM.get("diet-prof-goal").value = data.profile.goalWeight;
  DOM.get("diet-prof-target").value = data.profile.targetCalories;
}

// Profile Save handler
function saveDietProfile(event) {
  event.preventDefault();
  const data = getActiveDietData();
  
  const age = parseInt(DOM.get("diet-prof-age").value);
  const height = parseInt(DOM.get("diet-prof-height").value);
  const weight = parseFloat(DOM.get("diet-prof-weight").value);
  const goal = parseFloat(DOM.get("diet-prof-goal").value);
  const target = parseInt(DOM.get("diet-prof-target").value);
  
  if (age <= 0 || height <= 0 || weight <= 0 || goal <= 0 || target <= 0) {
    alert("Please enter positive numeric bounds!");
    return;
  }
  
  data.profile.age = age;
  data.profile.height = height;
  data.profile.weight = weight;
  data.profile.goalWeight = goal;
  data.profile.targetCalories = target;
  
  // Backwards integration: Save weight into weights database for selected date
  if (!fitnessData[currentUser].weights) {
    fitnessData[currentUser].weights = {};
  }
  fitnessData[currentUser].weights[selectedDietDate] = weight;
  fitnessData[currentUser].goalWeight = goal;
  
  saveData(); // Save Gym tracker data
  saveDietData(); // Save Diet tracker data
  
  alert("Diet profile saved successfully!");
  renderDietTracker();
}

// ── RENDER SUB-TAB 4: REPORTS & CALORIE HISTORY ──
function renderDietReports() {
  const data = getActiveDietData();
  
  // Calculate today's calories
  const todayStr = selectedDietDate;
  const todayAgg = getDietDateAggregates(data, currentUser, todayStr);
  const todayCals = todayAgg.calories;
  
  DOM.get("diet-report-today").textContent = `${todayCals} kcal`;
  
  // Gather active logs history
  const activeDates = Object.keys(data.meals).filter(d => {
    return getDietDateAggregates(data, currentUser, d).calories > 0;
  }).sort();
  
  // Calculate Weekly Average (past 7 active days)
  let weeklySum = 0;
  const weeklyDates = activeDates.slice(-7);
  weeklyDates.forEach(d => {
    weeklySum += getDietDateAggregates(data, currentUser, d).calories;
  });
  const weeklyAvg = weeklyDates.length ? Math.round(weeklySum / weeklyDates.length) : 0;
  DOM.get("diet-report-weekly-avg").textContent = `${weeklyAvg} kcal`;
  
  // Calculate Monthly Average (past 30 active days)
  let monthlySum = 0;
  const monthlyDates = activeDates.slice(-30);
  monthlyDates.forEach(d => {
    monthlySum += getDietDateAggregates(data, currentUser, d).calories;
  });
  const monthlyAvg = monthlyDates.length ? Math.round(monthlySum / monthlyDates.length) : 0;
  DOM.get("diet-report-monthly-avg").textContent = `${monthlyAvg} kcal`;
  
  // History table population
  const tbody = DOM.get("diet-history-tbody");
  tbody.innerHTML = "";
  
  if (activeDates.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No meals recorded yet.</td></tr>`;
  } else {
    // Reverse chronological order
    const reverseDates = [...activeDates].reverse();
    reverseDates.forEach(d => {
      const { calories: dayTotal, protein: pTotal, carbs: cTotal, fat: fTotal } = getDietDateAggregates(data, currentUser, d);
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: 600;">${formatDateLong(d)}</td>
        <td style="font-weight: 700; color: var(--accent);">${dayTotal} kcal</td>
        <td>
          <span style="color: #ef4444; font-weight: 500;">P: ${pTotal}g</span> • 
          <span style="color: #eab308; font-weight: 500;">C: ${cTotal}g</span> • 
          <span style="color: #3b82f6; font-weight: 500;">F: ${fTotal}g</span>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="onDietDateChanged('${d}'); switchDietTab('log');" style="padding: 4px 8px; font-size: 11px;">
            View Log
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// Open/close add food bottom-sheet modal
function openAddFoodModal(mealType) {
  activeLoggingMeal = mealType;
  selectedDietCategory = ""; // Reset category filter
  
  // Set modal title depending on context (schedule vs log)
  const titleEl = DOM.get("diet-modal-title-text");
  if (titleEl) {
    if (activeDietTab === "schedule") {
      const day = DOM.get("diet-sched-day-select").value;
      titleEl.textContent = `Add to ${day}'s ${mealType}`;
    } else {
      titleEl.textContent = `Add to ${mealType}`;
    }
  }
  
  // Reset search input
  const searchInput = DOM.get("diet-search-input");
  if (searchInput) searchInput.value = "";
  
  // Render category chips
  renderCategoryChips();
  
  // Reset search page
  dietSearchPage = 1;
  
  // Perform initial search
  onDietSearch();
  
  // Show modal
  const modal = DOM.get("diet-food-modal");
  if (modal) modal.classList.add("active");
}

function closeAddFoodModal() {
  const modal = DOM.get("diet-food-modal");
  if (modal) modal.classList.remove("active");
  activeLoggingMeal = "";
}

function loadExerciseVideo(info) {
  const container = DOM.get("ex-modal-video-container");
  if (!container) return;

  container.innerHTML = "";

  if (info && info.youtubeId) {
    container.style.display = "block";
    
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.width = "100%";
    wrapper.style.paddingBottom = "56.25%"; // 16:9 Aspect Ratio
    wrapper.style.height = "0";
    wrapper.style.borderRadius = "var(--radius-sm)";
    wrapper.style.overflow = "hidden";
    wrapper.style.background = "#000";
    wrapper.style.border = "1px solid var(--border-color)";
    wrapper.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    wrapper.style.marginBottom = "10px";

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    // Enable autoplay, mute, loop, playsinline, and hide related videos
    iframe.src = `https://www.youtube.com/embed/${info.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${info.youtubeId}&playsinline=1&controls=1&rel=0&modestbranding=1`;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;

    wrapper.appendChild(iframe);
    container.appendChild(wrapper);
  } else {
    container.style.display = "none";
  }
}

function showExerciseInfo(exerciseId) {
  const info = exerciseInstructions[exerciseId];
  if (!info) return;

  const modal = DOM.get("exercise-info-modal");
  const title = DOM.get("ex-modal-name");
  const stepsList = DOM.get("ex-modal-steps");
  const tipsText = DOM.get("ex-modal-tips");

  if (!modal || !title || !stepsList || !tipsText) return;

  title.textContent = info.name;

  // Load the exercise demonstration video
  loadExerciseVideo(info);

  stepsList.innerHTML = "";
  if (info.steps && Array.isArray(info.steps)) {
    info.steps.forEach(step => {
      const li = document.createElement("li");
      li.textContent = step;
      stepsList.appendChild(li);
    });
  }

  tipsText.textContent = info.tips || "";

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");

  // Hide navigation buttons/sidebar to prevent blocking Pro Tips
  const sidebar = document.querySelector(".app-sidebar");
  if (sidebar) {
    sidebar.style.display = "none";
  }
}

function closeExerciseInfoModal() {
  const modal = DOM.get("exercise-info-modal");
  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }

  // Clear the video container to stop playback/audio
  const container = DOM.get("ex-modal-video-container");
  if (container) {
    container.innerHTML = "";
    container.style.display = "none";
  }

  // Restore navigation buttons/sidebar
  const sidebar = document.querySelector(".app-sidebar");
  if (sidebar) {
    sidebar.style.display = "";
  }
}

let selectedDictCategory = "";

function renderExerciseDictionary() {
  const container = DOM.get("dict-exercise-list");
  const chipsContainer = DOM.get("dict-cat-chips");
  if (!container || !chipsContainer) return;

  // 1. Render Category Chips
  const categories = ["chest", "back", "legs", "shoulders", "arms", "core", "cardio", "mobility"];
  const displayNames = {
    chest: "Chest",
    back: "Back",
    legs: "Legs",
    shoulders: "Shoulders",
    arms: "Arms",
    core: "Core",
    cardio: "Cardio",
    mobility: "Mobility"
  };

  chipsContainer.innerHTML = "";
  
  // All chip
  const allChip = document.createElement("button");
  allChip.className = `diet-chip ${!selectedDictCategory ? "active" : ""}`;
  allChip.textContent = "All Muscle Groups";
  allChip.onclick = () => {
    selectedDictCategory = "";
    renderExerciseDictionary();
  };
  chipsContainer.appendChild(allChip);

  categories.forEach(cat => {
    const chip = document.createElement("button");
    chip.className = `diet-chip ${selectedDictCategory === cat ? "active" : ""}`;
    chip.textContent = displayNames[cat];
    chip.onclick = () => {
      selectedDictCategory = cat;
      renderExerciseDictionary();
    };
    chipsContainer.appendChild(chip);
  });

  // 2. Render Cards
  const searchInput = DOM.get("dict-search-input");
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

  container.innerHTML = "";

  Object.keys(exerciseInstructions).forEach(key => {
    const ex = exerciseInstructions[key];
    
    // Category filter
    if (selectedDictCategory && ex.category !== selectedDictCategory) return;

    // Search query filter
    if (query && !ex.name.toLowerCase().includes(query)) return;

    // Generate Card HTML
    const card = document.createElement("div");
    card.className = "glass-card";
    card.style.padding = "16px";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.justifyContent = "space-between";
    card.style.gap = "10px";
    card.style.transition = "var(--transition)";

    // Hover effect
    card.onmouseenter = () => {
      card.style.borderColor = "var(--accent)";
      card.style.transform = "translateY(-2px)";
    };
    card.onmouseleave = () => {
      card.style.borderColor = "var(--border-color)";
      card.style.transform = "none";
    };

    // Body
    const topRow = document.createElement("div");
    topRow.style.display = "flex";
    topRow.style.justifyContent = "space-between";
    topRow.style.alignItems = "flex-start";

    const name = document.createElement("h4");
    name.style.margin = "0";
    name.style.fontSize = "15px";
    name.style.fontWeight = "700";
    name.style.color = "var(--text-main)";
    name.textContent = ex.name;

    const catBadge = document.createElement("span");
    catBadge.style.fontSize = "10px";
    catBadge.style.fontWeight = "700";
    catBadge.style.padding = "3px 8px";
    catBadge.style.borderRadius = "12px";
    catBadge.style.textTransform = "uppercase";
    catBadge.style.background = "rgba(255, 255, 255, 0.05)";
    catBadge.style.border = "1px solid var(--border-color)";
    catBadge.style.color = "var(--text-sub)";
    catBadge.textContent = displayNames[ex.category] || ex.category;

    if (ex.category === selectedDictCategory) {
      catBadge.style.borderColor = "var(--accent)";
      catBadge.style.color = "var(--accent)";
      catBadge.style.background = "var(--accent-glow)";
    }

    topRow.appendChild(name);
    topRow.appendChild(catBadge);
    card.appendChild(topRow);

    // Primary steps preview
    const preview = document.createElement("p");
    preview.style.margin = "0";
    preview.style.fontSize = "12px";
    preview.style.lineHeight = "1.5";
    preview.style.color = "var(--text-sub)";
    preview.textContent = ex.steps && ex.steps[0] ? ex.steps[0] : "";
    card.appendChild(preview);

    // Form Guide Button
    const btn = document.createElement("button");
    btn.className = "btn btn-secondary";
    btn.style.width = "100%";
    btn.style.padding = "8px 12px";
    btn.style.fontSize = "12px";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.gap = "6px";
    btn.innerHTML = `<i data-lucide="video" style="width: 14px; height: 14px;"></i> Form Guide`;
    btn.onclick = () => {
      showExerciseInfo(key);
    };

    card.appendChild(btn);
    container.appendChild(card);
  });

  // Reinitialize lucide icons inside generated content
  if (typeof safeCreateIcons !== 'undefined') {
    safeCreateIcons();
  } else if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }

  // Trigger 1RM Calculator initialization
  if (typeof calculateOneRepMax === 'function') {
    calculateOneRepMax();
  }
}

function onDictSearch() {
  renderExerciseDictionary();
}

function playSuccessSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // First tone (G5, 783.99 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(783.99, ctx.currentTime);
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);
    
    // Second tone (C6, 1046.50 Hz) starting slightly later
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.08);
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.3);

    // Auto-close AudioContext to free hardware resources and save battery
    setTimeout(() => {
      ctx.close().catch(err => console.warn("Error closing AudioContext:", err));
    }, 400);
  } catch (e) {
    console.warn("Web Audio API not supported or allowed yet:", e);
  }
}

function renderCategoryChips() {
  const container = DOM.get("diet-cat-chips-container");
  if (!container) return;
  container.innerHTML = "";
  
  // Generate categories from dietFoods
  const cats = [...new Set(dietFoods.map(f => f.c))].sort();
  
  // Add "All" chip
  const allChip = document.createElement("div");
  allChip.className = `diet-chip ${!selectedDietCategory ? "active" : ""}`;
  allChip.textContent = "All Categories";
  allChip.onclick = () => selectCategoryChip("");
  container.appendChild(allChip);
  
  cats.forEach(c => {
    const chip = document.createElement("div");
    chip.className = `diet-chip ${selectedDietCategory === c ? "active" : ""}`;
    chip.textContent = c;
    chip.onclick = () => selectCategoryChip(c);
    container.appendChild(chip);
  });
}

function selectCategoryChip(catName) {
  selectedDietCategory = catName;
  renderCategoryChips();
  dietSearchPage = 1;
  onDietSearch();
}

// ── FOOD DATABASE SEARCH & PAGINATION CONTROLLER ──
function onDietSearch() {
  const searchInput = DOM.get("diet-search-input");
  const query = searchInput ? searchInput.value.toLowerCase() : "";
  const filterCat = selectedDietCategory;
  
  const sortSelect = DOM.get("diet-sort-select");
  const sortBy = sortSelect ? sortSelect.value : "name-asc";
  
  let list = dietFoods.filter(f => {
    return (!query || f.n.toLowerCase().includes(query)) && (!filterCat || f.c === filterCat);
  });
  
  // Sorting logic
  if (sortBy === "name-asc") {
    list.sort((a,b) => a.n.localeCompare(b.n));
  } else if (sortBy === "cal-asc") {
    list.sort((a,b) => a.k - b.k);
  } else if (sortBy === "cal-desc") {
    list.sort((a,b) => b.k - a.k);
  }
  
  const total = list.length;
  const totalPages = Math.ceil(total / dietSearchPageSize) || 1;
  if (dietSearchPage > totalPages) dietSearchPage = totalPages;
  if (dietSearchPage < 1) dietSearchPage = 1;
  
  const startIdx = (dietSearchPage - 1) * dietSearchPageSize;
  const pageSlice = list.slice(startIdx, startIdx + dietSearchPageSize);
  
  const listContainer = DOM.get("diet-search-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";
  
  if (pageSlice.length === 0) {
    listContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px; font-size: 13px;">No food matches found.</div>`;
  } else {
    pageSlice.forEach(f => {
      const macros = getFoodMacros(f);
      const row = document.createElement("div");
      row.className = "diet-search-row";
      row.onclick = () => addSearchedFood(f.n);
      row.innerHTML = `
        <div class="diet-search-row-left">
          <span class="diet-search-row-name">${f.n}</span>
          <div class="diet-search-row-meta">
            <span class="diet-search-row-cat">${f.c}</span>
            <span>•</span>
            <span>${f.s}</span>
          </div>
        </div>
        <div class="diet-search-row-right">
          <div class="diet-search-row-kcal">
            <div>${f.k} kcal</div>
            <div style="font-size: 9px; font-weight: normal; color: var(--text-muted); margin-top: 1px;">
              P:${macros.protein}g C:${macros.carbs}g F:${macros.fat}g
            </div>
          </div>
          <button class="diet-search-row-add-btn" title="Add to meal">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
      `;
      listContainer.appendChild(row);
    });
  }
  
  const pageInfoEl = DOM.get("diet-page-info");
  if (pageInfoEl) pageInfoEl.textContent = `Page ${dietSearchPage} of ${totalPages}`;
  
  const showingInfoEl = DOM.get("diet-showing-info");
  if (showingInfoEl) showingInfoEl.textContent = `(${total} items)`;
  
  const prevBtn = DOM.get("diet-prev-btn");
  if (prevBtn) prevBtn.disabled = dietSearchPage <= 1;
  
  const nextBtn = DOM.get("diet-next-btn");
  if (nextBtn) nextBtn.disabled = dietSearchPage >= totalPages;
  
  safeCreateIcons();
}

function changeDietPage(dir) {
  dietSearchPage += dir;
  onDietSearch();
}

// Scale food calories and macros based on user weight log
function scaleFoodMetrics(food, loggedWeight) {
  const stdWeight = food.w || 100; // fallback to 100
  const factor = loggedWeight / stdWeight;
  const baseMacros = getFoodMacros(food);
  
  return {
    k: Math.round(food.k * factor),
    p: Math.round(baseMacros.protein * factor * 10) / 10,
    carb: Math.round(baseMacros.carbs * factor * 10) / 10,
    f: Math.round(baseMacros.fat * factor * 10) / 10
  };
}

let activePortionFood = null;

// Add searched food selection: opens portion logging modal
function addSearchedFood(foodName) {
  const food = dietFoods.find(f => f.n === foodName);
  if (!food) return;
  
  activePortionFood = food;
  
  // Close the search modal
  const searchModal = DOM.get("diet-food-modal");
  if (searchModal) searchModal.classList.remove("active");
  
  // Open the portion modal
  const portionModal = DOM.get("diet-portion-modal");
  if (portionModal) {
    portionModal.classList.add("active");
    
    // Set UI details
    DOM.get("portion-food-name").textContent = food.n;
    DOM.get("portion-food-category").textContent = food.c;
    DOM.get("portion-recommended-size").textContent = `${food.s}`;
    
    // Set default weight in input
    const defaultWeight = food.w || 100;
    DOM.get("portion-weight-input").value = defaultWeight;
    
    // Render dynamic calorie/macro stats
    updatePortionModalStats();
  }
}

function updatePortionModalStats() {
  if (!activePortionFood) return;
  const weightInput = DOM.get("portion-weight-input");
  let weight = parseFloat(weightInput.value);
  if (isNaN(weight) || weight <= 0) weight = 0;
  
  const scaled = scaleFoodMetrics(activePortionFood, weight);
  
  DOM.get("portion-display-cal").textContent = `${scaled.k} kcal`;
  DOM.get("portion-display-protein").textContent = `${scaled.p}g`;
  DOM.get("portion-display-carbs").textContent = `${scaled.carb}g`;
  DOM.get("portion-display-fat").textContent = `${scaled.f}g`;
}

function onPortionWeightChange() {
  updatePortionModalStats();
}

function stepPortionWeight(delta) {
  const input = DOM.get("portion-weight-input");
  let val = parseFloat(input.value) || 0;
  val = Math.max(0, val + delta);
  input.value = val;
  updatePortionModalStats();
}

function setPortionMultiplier(mult) {
  if (!activePortionFood) return;
  const stdWeight = activePortionFood.w || 100;
  const input = DOM.get("portion-weight-input");
  input.value = Math.round(stdWeight * mult);
  updatePortionModalStats();
}

function closePortionModal() {
  const portionModal = DOM.get("diet-portion-modal");
  if (portionModal) portionModal.classList.remove("active");
  activePortionFood = null;
}

function confirmAddPortion() {
  if (!activePortionFood || !activeLoggingMeal) return;
  
  const input = DOM.get("portion-weight-input");
  let weight = parseFloat(input.value);
  if (isNaN(weight) || weight <= 0) {
    alert("Please enter a valid weight in grams!");
    return;
  }
  
  const scaled = scaleFoodMetrics(activePortionFood, weight);
  const data = getActiveDietData();
  
  const foodEntry = {
    n: activePortionFood.n,
    c: activePortionFood.c,
    s: `${weight}g portion (${activePortionFood.s})`,
    k: scaled.k,
    p: scaled.p,
    carb: scaled.carb,
    f: scaled.f
  };
  
  if (activeDietTab === "log") {
    const todayStr = dateToYYYYMMDD(new Date());
    if (selectedDietDate > todayStr) {
      alert("You cannot log diet items for future dates!");
      return;
    }
    ensureDietDateRecord(data, selectedDietDate);
    data.meals[selectedDietDate][activeLoggingMeal].push(foodEntry);
  } else if (activeDietTab === "schedule") {
    const day = DOM.get("diet-sched-day-select").value;
    data.schedule[day][activeLoggingMeal].push(foodEntry);
  }
  
  saveDietData();
  renderDietTracker();
  closePortionModal();
}

// ── PRESET PLAN LOADERS ──
function loadPresetPlanToday() {
  const todayStr = dateToYYYYMMDD(new Date());
  if (selectedDietDate > todayStr) {
    alert("You cannot log preset items for future dates!");
    return;
  }

  if (confirm("Load default dietician plan (Poha, Rice/Dal/Veg, Roasted Chana, Roti/Soybean/Milk) into today's log? This will overwrite any currently logged items for today.")) {
    const data = getActiveDietData();
    ensureDietDateRecord(data, selectedDietDate);
    
    // Clear existing meals for this day
    data.meals[selectedDietDate] = {
      Breakfast: [],
      Lunch: [],
      EveningSnacks: [],
      Dinner: []
    };
    
    const preset = JSON.parse(JSON.stringify(defaultPresetDiet));
    
    ["Breakfast", "Lunch", "EveningSnacks", "Dinner"].forEach(type => {
      preset[type].forEach(food => {
        data.meals[selectedDietDate][type].push(food);
      });
    });
    
    saveDietData();
    renderDietTracker();
  }
}

// Import schedule of today's day-of-week into daily logs
function copyScheduleToToday() {
  const todayStr = dateToYYYYMMDD(new Date());
  if (selectedDietDate > todayStr) {
    alert("You cannot log scheduled items for future dates!");
    return;
  }

  const d = new Date(selectedDietDate);
  const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = weekdayNames[d.getDay()];
  
  if (confirm(`Load your custom scheduled ${dayName} plan into today's log? This will overwrite any currently logged items for today.`)) {
    const data = getActiveDietData();
    ensureDietDateRecord(data, selectedDietDate);
    
    // Clear existing meals for this day
    data.meals[selectedDietDate] = {
      Breakfast: [],
      Lunch: [],
      EveningSnacks: [],
      Dinner: []
    };
    
    const sched = JSON.parse(JSON.stringify(data.schedule[dayName] || {}));
    
    ["Breakfast", "Lunch", "EveningSnacks", "Dinner"].forEach(type => {
      const foods = sched[type] || [];
      foods.forEach(food => {
        data.meals[selectedDietDate][type].push(food);
      });
    });
    
    saveDietData();
    renderDietTracker();
  }
}

/* ============================================================
   11. STOPWATCH & REST TIMER UTILITIES
   ============================================================ */
let stopwatchInterval = null;
let stopwatchTime = 0; // in milliseconds
let stopwatchRunning = false;
let isCountdown = false;
let countdownEndTime = 0;

function toggleStopwatch() {
  const panel = DOM.get("stopwatch-overlay");
  if (!panel) return;
  const isHidden = panel.style.display === "none";
  panel.style.display = isHidden ? "flex" : "none";
  
  // Refresh icons inside the panel
  safeCreateIcons();
}

function updateStopwatchDisplay() {
  const display = DOM.get("sw-display");
  if (!display) return;
  
  let totalMs = stopwatchTime;
  if (isCountdown) {
    totalMs = Math.max(0, countdownEndTime - Date.now());
    if (totalMs === 0) {
      stopStopwatch();
      playSuccessSound();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }

  const mins = Math.floor(totalMs / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const tenths = Math.floor((totalMs % 1000) / 100);

  display.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}`;
}

function startStopwatch() {
  const startBtn = DOM.get("sw-start-btn");
  if (!startBtn) return;

  if (stopwatchRunning) {
    stopStopwatch();
  } else {
    stopwatchRunning = true;
    startBtn.textContent = "Pause";
    startBtn.classList.replace("btn-primary", "btn-danger");
    
    if (isCountdown) {
      countdownEndTime = Date.now() + stopwatchTime;
    }
    
    const startTime = Date.now() - (isCountdown ? 0 : stopwatchTime);
    
    stopwatchInterval = setInterval(() => {
      if (isCountdown) {
        stopwatchTime = Math.max(0, countdownEndTime - Date.now());
        updateStopwatchDisplay();
      } else {
        stopwatchTime = Date.now() - startTime;
        updateStopwatchDisplay();
      }
    }, 100);
  }
}

function stopStopwatch() {
  stopwatchRunning = false;
  const startBtn = DOM.get("sw-start-btn");
  if (startBtn) {
    startBtn.textContent = "Start";
    startBtn.classList.replace("btn-danger", "btn-primary");
  }
  if (stopwatchInterval) {
    clearInterval(stopwatchInterval);
    stopwatchInterval = null;
  }
}

function resetStopwatch() {
  stopStopwatch();
  stopwatchTime = 0;
  isCountdown = false;
  updateStopwatchDisplay();
}

function startCountdown(seconds) {
  stopStopwatch();
  isCountdown = true;
  stopwatchTime = seconds * 1000;
  countdownEndTime = Date.now() + stopwatchTime;
  updateStopwatchDisplay();
  startStopwatch();
}


/* ============================================================
   12.5 EXERCISE TIMERS LOGIC & STATE HELPERS
   ============================================================ */
let activeTimers = {}; // { exerciseId: { intervalId, remainingSeconds, targetSeconds, state, setsCount, setsCompleted } }
let currentTimerExerciseId = null;

function parseTargetSeconds(repsText) {
  if (!repsText) return 60;
  const text = repsText.toLowerCase();
  
  if (text.includes("min")) {
    const matches = text.match(/\d+/g);
    if (matches && matches.length > 0) {
      const mins = Math.max(...matches.map(Number));
      return mins * 60;
    }
  }
  
  if (text.includes("sec")) {
    const matches = text.match(/\d+/g);
    if (matches && matches.length > 0) {
      const secs = Math.max(...matches.map(Number));
      return secs;
    }
  }

  if (text.includes("mobility") || text.includes("stretch") || text.includes("stretching") || text.includes("warm-up") || text.includes("cool-down")) {
    return 300;
  }
  
  return 60; // default rest/effort timer
}

function parseTotalSets(setsText, repsText) {
  const text = String(setsText || repsText || "3").toLowerCase();
  const setMatches = text.match(/(\d+)\s*(?:sets?|x)/);
  if (setMatches && setMatches[1]) {
    return parseInt(setMatches[1], 10);
  }
  const singleMatch = text.match(/^\s*(\d+)\s*$/);
  if (singleMatch && singleMatch[1]) {
    return parseInt(singleMatch[1], 10);
  }
  return 3;
}

function formatTimerTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Alarm Audio & Banner Globals
let alarmIntervalId = null;
let alarmAudioCtx = null;

function playAlarmSound() {
  stopAlarmSound(); // Clear any existing alarm
  
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    alarmAudioCtx = new AudioContext();
    
    let beepCount = 0;
    
    // Play a dual-beep sequence every 1.5 seconds, up to 10 times or until stopped
    alarmIntervalId = setInterval(() => {
      if (beepCount >= 10) {
        stopAlarmSound();
        const banner = DOM.get("timer-alarm-banner");
        if (banner) banner.style.display = "none";
        return;
      }
      
      const now = alarmAudioCtx.currentTime;
      
      // First beep (B5 note, 987.77 Hz)
      const osc1 = alarmAudioCtx.createOscillator();
      const gain1 = alarmAudioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(alarmAudioCtx.destination);
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(987.77, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.start(now);
      osc1.stop(now + 0.15);
      
      // Second beep slightly delayed
      const osc2 = alarmAudioCtx.createOscillator();
      const gain2 = alarmAudioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(alarmAudioCtx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(987.77, now + 0.2);
      gain2.gain.setValueAtTime(0.2, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.35);
      
      beepCount++;
    }, 1500);
    
  } catch (e) {
    console.warn("Web Audio API not supported for alarm:", e);
  }
}

function stopAlarmSound() {
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
  if (alarmAudioCtx) {
    alarmAudioCtx.close().catch(err => console.warn("Error closing alarm AudioContext:", err));
    alarmAudioCtx = null;
  }
}

function showTimerCompletionBanner() {
  const banner = DOM.get("timer-alarm-banner");
  if (banner) {
    banner.style.display = "flex";
    safeCreateIcons();
  }
}

function hideTimerCompletionBanner() {
  const banner = DOM.get("timer-alarm-banner");
  if (banner) {
    banner.style.display = "none";
  }
}

function openTimerModal(exerciseId, name, setsText, repsText) {
  if (selectedDate > dateToYYYYMMDD(new Date())) {
    alert("Cannot start timers for future dates.");
    return;
  }
  
  ensureDateRecord(currentUser, selectedDate);
  const record = fitnessData[currentUser].workouts[selectedDate];

  // Stop alarm if running and hide banner
  stopAlarmSound();
  hideTimerCompletionBanner();

  currentTimerExerciseId = exerciseId;
  
  // Resolve or initialize timer state
  let timer = activeTimers[exerciseId];
  if (!timer) {
    const target = parseTargetSeconds(repsText);
    const setsCount = parseTotalSets(setsText, repsText);
    const targetReps = parseInt(repsText) || 10;
    
    // Check if there are already logs saved in record.exerciseLogs for this exercise
    const savedLogs = (record.exerciseLogs && record.exerciseLogs[exerciseId]) ? record.exerciseLogs[exerciseId] : null;
    
    timer = {
      exerciseId: exerciseId,
      intervalId: null,
      remainingSeconds: target,
      targetSeconds: target,
      state: 'idle',
      setsCount: setsCount,
      setsCompleted: Array(setsCount).fill(false),
      setsLogs: []
    };
    
    // Prefill weight & reps from saved logs or default to target reps
    for (let i = 0; i < setsCount; i++) {
      if (savedLogs && savedLogs[i]) {
        timer.setsCompleted[i] = savedLogs[i].completed || false;
        timer.setsLogs.push({
          weight: savedLogs[i].weight !== undefined ? savedLogs[i].weight : "",
          reps: savedLogs[i].reps !== undefined ? savedLogs[i].reps : targetReps,
          completed: savedLogs[i].completed || false
        });
      } else {
        timer.setsLogs.push({
          weight: "", // default is empty
          reps: targetReps, // default to target reps
          completed: false
        });
      }
    }
    
    activeTimers[exerciseId] = timer;
  }

  // Populate UI
  DOM.get("timer-modal-ex-name").textContent = name;
  DOM.get("timer-modal-ex-details").textContent = setsText ? `${setsText} Sets × ${repsText}` : `${timer.setsCount} Sets × ${repsText}`;
  
  // Pause any other running timers
  Object.keys(activeTimers).forEach(id => {
    if (id !== exerciseId && activeTimers[id].state === 'running') {
      clearInterval(activeTimers[id].intervalId);
      activeTimers[id].intervalId = null;
      activeTimers[id].state = 'paused';
      
      const otherBtn = DOM.get(`timer-btn-${id}`);
      const otherDisplay = DOM.get(`timer-val-${id}`);
      if (otherBtn) otherBtn.innerHTML = `<i data-lucide="play" style="width: 14px; height: 14px;"></i>`;
      if (otherDisplay) otherDisplay.classList.remove("counting");
    }
  });

  // Render sets dashboard
  renderTimerModalSets();
  
  // Update static UI
  updateTimerModalUI();
  
  // Show modal
  const modal = DOM.get("exercise-timer-modal");
  if (modal) {
    modal.style.display = "flex";
    requestAnimationFrame(() => {
      modal.classList.add("active");
    });
  }

  // Hide floating sidebar navigation to avoid overlap
  const sidebar = document.querySelector('.app-sidebar');
  if (sidebar) sidebar.style.display = 'none';
  
  safeCreateIcons();
}

function closeTimerModal() {
  const modal = DOM.get("exercise-timer-modal");
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  }
  
  currentTimerExerciseId = null;
  
  // Stop alarm if running and hide banner
  stopAlarmSound();
  hideTimerCompletionBanner();

  // Restore sidebar
  const sidebar = document.querySelector('.app-sidebar');
  if (sidebar) sidebar.style.display = '';
  
  safeCreateIcons();
}

function updateTimerModalUI() {
  if (!currentTimerExerciseId) return;
  const timer = activeTimers[currentTimerExerciseId];
  if (!timer) return;

  // Update text values
  DOM.get("timer-modal-countdown").textContent = formatTimerTime(timer.remainingSeconds);
  DOM.get("timer-modal-state").textContent = timer.state.toUpperCase();
  
  // Update progress circle ring
  const circle = DOM.get("timer-circle-progress");
  if (circle) {
    const circumference = 414.7; // 2 * pi * 66
    const ratio = timer.targetSeconds > 0 ? (timer.remainingSeconds / timer.targetSeconds) : 0;
    circle.style.strokeDashoffset = circumference - (ratio * circumference);
  }

  // Update button icons
  const ctrlBtn = DOM.get("timer-modal-control-btn");
  if (ctrlBtn) {
    if (timer.state === 'running') {
      ctrlBtn.innerHTML = `<i data-lucide="pause" style="width: 16px; height: 16px;"></i> Pause`;
    } else {
      ctrlBtn.innerHTML = `<i data-lucide="play" style="width: 16px; height: 16px;"></i> Start`;
    }
  }
  safeCreateIcons();
}

function renderTimerModalSets() {
  if (!currentTimerExerciseId) return;
  const timer = activeTimers[currentTimerExerciseId];
  if (!timer) return;

  const container = DOM.get("timer-modal-sets-list");
  if (!container) return;
  
  container.innerHTML = "";
  
  let doneCount = 0;
  for (let i = 0; i < timer.setsCount; i++) {
    const isDone = timer.setsCompleted[i];
    if (isDone) doneCount++;

    const setLog = timer.setsLogs[i];

    const row = document.createElement("div");
    row.className = `timer-set-row ${isDone ? 'completed' : ''}`;

    // Set Label
    const label = document.createElement("span");
    label.style.fontSize = "13px";
    label.style.fontWeight = "700";
    label.style.color = isDone ? "var(--success)" : "var(--text-main)";
    label.style.width = "40px";
    label.textContent = `Set ${i + 1}`;

    // Inputs Wrapper
    const inputsWrapper = document.createElement("div");
    inputsWrapper.style.display = "flex";
    inputsWrapper.style.alignItems = "center";
    inputsWrapper.style.gap = "4px";

    // Weight Input
    const weightInput = document.createElement("input");
    weightInput.type = "number";
    weightInput.inputMode = "decimal";
    weightInput.className = "timer-set-input";
    weightInput.placeholder = "--";
    weightInput.value = setLog.weight;
    weightInput.disabled = isDone;
    weightInput.style.width = "55px";
    weightInput.onfocus = function() { this.select(); };
    weightInput.onchange = (e) => {
      setLog.weight = e.target.value ? parseFloat(e.target.value) : "";
    };

    const kgLabel = document.createElement("span");
    kgLabel.style.fontSize = "11px";
    kgLabel.style.color = "var(--text-sub)";
    kgLabel.textContent = "kg";

    // Separator
    const timesLabel = document.createElement("span");
    timesLabel.style.fontSize = "11px";
    timesLabel.style.color = "var(--text-sub)";
    timesLabel.style.margin = "0 2px";
    timesLabel.textContent = "×";

    // Reps Input
    const repsInput = document.createElement("input");
    repsInput.type = "number";
    repsInput.inputMode = "numeric";
    repsInput.className = "timer-set-input";
    repsInput.placeholder = "10";
    repsInput.value = setLog.reps;
    repsInput.disabled = isDone;
    repsInput.style.width = "45px";
    repsInput.onfocus = function() { this.select(); };
    repsInput.onchange = (e) => {
      setLog.reps = parseInt(e.target.value, 10) || 10;
    };

    const repsLabel = document.createElement("span");
    repsLabel.style.fontSize = "11px";
    repsLabel.style.color = "var(--text-sub)";
    repsLabel.textContent = "reps";

    inputsWrapper.appendChild(weightInput);
    inputsWrapper.appendChild(kgLabel);
    inputsWrapper.appendChild(timesLabel);
    inputsWrapper.appendChild(repsInput);
    inputsWrapper.appendChild(repsLabel);

    // Action button
    const logBtn = document.createElement("button");
    logBtn.className = `timer-log-set-btn ${isDone ? 'done' : ''}`;
    
    if (isDone) {
      logBtn.textContent = "Done ✓";
    } else {
      logBtn.textContent = "Log Set";
    }

    logBtn.onclick = () => {
      toggleTimerModalSet(i);
    };

    row.appendChild(label);
    row.appendChild(inputsWrapper);
    row.appendChild(logBtn);
    container.appendChild(row);
  }

  // Update ratio text
  const ratioText = DOM.get("timer-modal-set-ratio");
  if (ratioText) {
    ratioText.textContent = `Done: ${doneCount}/${timer.setsCount}`;
  }
}

function toggleTimerModalSet(idx) {
  if (!currentTimerExerciseId) return;
  const timer = activeTimers[currentTimerExerciseId];
  if (!timer) return;

  const willBeCompleted = !timer.setsCompleted[idx];
  timer.setsCompleted[idx] = willBeCompleted;
  
  if (timer.setsLogs && timer.setsLogs[idx]) {
    timer.setsLogs[idx].completed = willBeCompleted;
  }
  
  // Render immediately to update disabled state and Done button
  renderTimerModalSets();
  
  if (willBeCompleted) {
    if (navigator.vibrate) {
      navigator.vibrate(80);
    }
    
    // Auto-trigger rest timer if completed a set and timer is not already running
    if (timer.state !== 'running') {
      timer.remainingSeconds = timer.targetSeconds;
      toggleTimerModalState(); // Starts the timer
    }
  }

  // Check if ALL sets are done, play a feedback pulse
  if (timer.setsCompleted.every(s => s === true)) {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }
}

function toggleTimerModalState() {
  if (!currentTimerExerciseId) return;
  const timer = activeTimers[currentTimerExerciseId];
  if (!timer) return;

  const display = DOM.get(`timer-val-${currentTimerExerciseId}`);
  const btn = DOM.get(`timer-btn-${currentTimerExerciseId}`);

  // Silence alarm if active
  stopAlarmSound();
  hideTimerCompletionBanner();

  if (timer.state === 'running') {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
    timer.state = 'paused';
    
    if (display) display.classList.remove("counting");
    if (btn) btn.innerHTML = `<i data-lucide="play" style="width: 14px; height: 14px;"></i>`;
    
    updateTimerModalUI();
  } else {
    timer.state = 'running';
    if (display) display.classList.add("counting");
    if (btn) btn.innerHTML = `<i data-lucide="pause" style="width: 14px; height: 14px;"></i>`;
    
    updateTimerModalUI();

    timer.intervalId = setInterval(() => {
      timer.remainingSeconds--;
      
      // Update modal UI if currently active and matches this timer
      if (currentTimerExerciseId === timer.exerciseId) {
        updateTimerModalUI();
      }

      // Update inline list display in background
      const liveDisplay = DOM.get(`timer-val-${timer.exerciseId}`);
      if (liveDisplay) {
        liveDisplay.textContent = formatTimerTime(timer.remainingSeconds);
      }

      if (timer.remainingSeconds <= 0) {
        clearInterval(timer.intervalId);
        timer.intervalId = null;
        timer.state = 'completed';
        
        // Haptic feedback (vibration) for Android
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }

        // Auto check/complete exercise
        const rec = fitnessData[currentUser].workouts[selectedDate];
        if (!rec.completedExercises.includes(timer.exerciseId)) {
          toggleExerciseCheck(timer.exerciseId);
        }

        const liveBtn = DOM.get(`timer-btn-${timer.exerciseId}`);
        if (liveBtn) liveBtn.style.display = "none";
        if (liveDisplay) {
          liveDisplay.textContent = "DONE";
          liveDisplay.classList.remove("counting");
          liveDisplay.classList.add("completed");
        }
        
        if (currentTimerExerciseId === timer.exerciseId) {
          playAlarmSound(); // PLAY SYNTHESIZED ALARM
          showTimerCompletionBanner(); // SHOW NOTIFICATION BANNER
          updateTimerModalUI();
        }
      }
    }, 1000);
  }
  safeCreateIcons();
}

function adjustTimerDuration(delta) {
  if (!currentTimerExerciseId) return;
  const timer = activeTimers[currentTimerExerciseId];
  if (!timer) return;

  timer.remainingSeconds = Math.max(0, timer.remainingSeconds + delta);
  if (timer.remainingSeconds > timer.targetSeconds) {
    timer.targetSeconds = timer.remainingSeconds;
  }
  
  stopAlarmSound();
  hideTimerCompletionBanner();
  updateTimerModalUI();
}

function resetTimerDuration() {
  if (!currentTimerExerciseId) return;
  const timer = activeTimers[currentTimerExerciseId];
  if (!timer) return;

  timer.remainingSeconds = timer.targetSeconds;
  
  stopAlarmSound();
  hideTimerCompletionBanner();
  updateTimerModalUI();
}

function completeExerciseFromTimer() {
  if (!currentTimerExerciseId) return;
  const timer = activeTimers[currentTimerExerciseId];
  if (!timer) {
    closeTimerModal();
    return;
  }

  ensureDateRecord(currentUser, selectedDate);
  const record = fitnessData[currentUser].workouts[selectedDate];
  
  // Complete exercise
  if (!record.completedExercises.includes(currentTimerExerciseId)) {
    record.completedExercises.push(currentTimerExerciseId);
    playSuccessSound();
  }

  // Remove from skipped list if it was there
  if (record.skippedExercises) {
    const skipIdx = record.skippedExercises.indexOf(currentTimerExerciseId);
    if (skipIdx !== -1) {
      record.skippedExercises.splice(skipIdx, 1);
    }
  }

  // Save the logged sets
  if (!record.exerciseLogs) {
    record.exerciseLogs = {};
  }
  record.exerciseLogs[currentTimerExerciseId] = timer.setsLogs || [];

  // Stop running interval
  if (timer.intervalId) {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
  }

  // Clean up
  delete activeTimers[currentTimerExerciseId];
  
  stopAlarmSound();
  hideTimerCompletionBanner();
  closeTimerModal();

  renderCheckIn();
  saveData();
}

function clearAllRunningTimers() {
  Object.keys(activeTimers).forEach(id => {
    if (activeTimers[id].intervalId) {
      clearInterval(activeTimers[id].intervalId);
    }
  });
  activeTimers = {};
}

function initKeyboardDetection() {
  const handleKeyboard = (isOpen) => {
    if (isOpen) {
      document.body.classList.add("keyboard-open");
    } else {
      setTimeout(() => {
        const active = document.activeElement;
        if (!active || (active.tagName !== "INPUT" && active.tagName !== "TEXTAREA" && active.getAttribute("contenteditable") !== "true")) {
          document.body.classList.remove("keyboard-open");
        }
      }, 100);
    }
  };

  document.addEventListener("focusin", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.getAttribute("contenteditable") === "true")) {
      handleKeyboard(true);
      if (e.target.id === "chat-message-input") {
        setTimeout(() => {
          const listEl = DOM.get("chat-messages-list");
          if (listEl) listEl.scrollTop = listEl.scrollHeight;
        }, 80);
      }
    }
  });

  document.addEventListener("focusout", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.getAttribute("contenteditable") === "true")) {
      handleKeyboard(false);
    }
  });

  if (window.visualViewport) {
    const threshold = 150;
    const initialHeight = window.visualViewport.height;
    window.visualViewport.addEventListener("resize", () => {
      if (window.visualViewport.height < initialHeight - threshold) {
        document.body.classList.add("keyboard-open");
        // Scroll to bottom immediately when keyboard expands
        setTimeout(() => {
          const listEl = DOM.get("chat-messages-list");
          if (listEl) listEl.scrollTop = listEl.scrollHeight;
        }, 50);
      } else if (window.visualViewport.height >= initialHeight - 40) {
        document.body.classList.remove("keyboard-open");
      }
    });
  }

  // Dismiss keyboard when tapping the messages list
  const listEl = DOM.get("chat-messages-list");
  if (listEl) {
    listEl.addEventListener("click", () => {
      DOM.get("chat-message-input")?.blur();
    });
  }
}


/* ============================================================
   13. INITIALIZATION ON LOAD
   ============================================================ */
window.addEventListener("DOMContentLoaded", async () => {
  console.log("DuoGym: DOMContentLoaded event fired.");

  // Load theme preference early (before auth check) so login page has correct theme
  const savedTheme = safeStorage.getItem("duogym_theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    const themeIcon = DOM.get("theme-icon");
    if (themeIcon) {
      themeIcon.setAttribute("data-lucide", "moon");
    }
  }

  // --- AUTH CHECK ---
  // If user has a valid "Remember Me" session, skip login and go straight to app
  const authSession = getAuthSession();
  let restoredProfile = authSession;
  try {
    const client = getSupabaseClient();
    if (client) {
      const { data: sessionData } = await client.auth.getSession();
      if (sessionData?.session?.user) {
        try {
          restoredProfile = await loadOrCreateAuthProfile(sessionData.session.user);
          setAuthSession(restoredProfile);
        } catch (error) {
          console.warn("FitRivals profile restore failed", error);
        }
      }
    }
  } catch (err) {
    console.warn("Supabase auth session fetch failed:", err);
  }
  
  if (restoredProfile?.username) {
    console.log("FitRivals: Valid auth session found for " + restoredProfile.username);
    isAuthenticated = true;
    authenticatedProfile = restoredProfile;
    authenticatedUser = restoredProfile.username;
    currentUser = restoredProfile.username;
    
    // Load data and initialize app
    loadData();
    const todayStr = dateToYYYYMMDD(new Date());
    selectedDate = isWithinSubscription(todayStr) ? todayStr : START_DATE_STR;
    
    // Hide login, show app
    const loginOverlay = DOM.get("login-overlay");
    if (loginOverlay) loginOverlay.classList.add("hidden");
    
    const appLayout = DOM.get("app-layout");
    if (appLayout) appLayout.style.display = "";
    
    // Initialize UI
    ensureUserData(restoredProfile.username);
    switchUser(restoredProfile.username);
    switchPage("today");
    updateLoggedInHeader(restoredProfile.username);
    initDietData();
    
    // Initialize Supabase sync
    if (typeof initSupabaseSync === 'function') {
      initSupabaseSync(restoredProfile.username);
    }
  } else {
    console.log("FitRivals: No valid auth session. Showing login page.");
    // Show login page, hide app
    const loginOverlay = DOM.get("login-overlay");
    if (loginOverlay) loginOverlay.classList.remove("hidden");
    
    const appLayout = DOM.get("app-layout");
    if (appLayout) appLayout.style.display = "none";
    
    // Pre-load data in background so it's ready after login
    loadData();
    setAuthMode("signin");
  }

  // Hide loading indicator
  const loadingEl = DOM.get("app-loading");
  if (loadingEl) {
    loadingEl.style.display = "none";
    console.log("DuoGym: Hid loading element.");
  }

  // Initialize keyboard layout adjustment listeners
  initKeyboardDetection();

  // Detect WebView mode
  const isWebView = window.location.protocol === "file:" || 
                    window.location.href.includes("android_asset") || 
                    window.location.hostname.includes("appassets.androidplatform.net");

  // Detect standalone PWA mode
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  // Show Download App button if on web browser
  const downloadBtn = DOM.get("download-app-btn");
  if (downloadBtn) {
    if (isWebView || isStandalone) {
      downloadBtn.style.display = "none";
    } else {
      downloadBtn.style.display = "flex";
    }
  }

  // Register PWA Service Worker
  if ("serviceWorker" in navigator && !isWebView) {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => {
        console.log("Service Worker Registered");
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "activated") {
                console.log("New service worker version activated. Reloading page...");
                window.location.reload();
              }
            });
          }
        });
      })
      .catch(err => console.error("Service Worker registration failed:", err));

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        console.log("Service Worker updated, reloading page...");
        window.location.reload();
      }
    });
  }

  // Create icons after everything is set up
  safeCreateIcons();
});


/* ============================================================
   13. FITNESS ECOSYSTEM: COACH, MISSIONS, WATER, AND REWARDS
   ============================================================ */

function toggleExerciseSkip(exerciseId) {
  if (selectedDate > dateToYYYYMMDD(new Date())) {
    alert("Cannot log workouts for future dates.");
    return;
  }
  ensureDateRecord(currentUser, selectedDate);
  const record = fitnessData[currentUser].workouts[selectedDate];
  
  if (!record.skippedExercises) {
    record.skippedExercises = [];
  }

  // Remove from completed if checking as skipped
  const compIdx = record.completedExercises.indexOf(exerciseId);
  if (compIdx !== -1) {
    record.completedExercises.splice(compIdx, 1);
  }

  const index = record.skippedExercises.indexOf(exerciseId);
  if (index === -1) {
    record.skippedExercises.push(exerciseId);
    
    // Play a low alert sound for skipping
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(150, audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch(e) {}
    
    // Stop running timer if skipped
    const timer = activeTimers[exerciseId];
    if (timer) {
      if (timer.intervalId) clearInterval(timer.intervalId);
      delete activeTimers[exerciseId];
    }
  } else {
    record.skippedExercises.splice(index, 1);
  }

  // Recalculate percentage
  const workout = getWorkoutForDate(selectedDate);
  const total = workout.exercises.length;
  const completed = record.completedExercises.length;
  record.completionPercentage = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;

  saveData();
  evaluateMissionsAndBadges();
  renderCheckIn();
}

function adjustWaterIntake(offsetMl) {
  if (selectedDate > dateToYYYYMMDD(new Date())) {
    alert("Cannot log water for future dates.");
    return;
  }
  ensureDateRecord(currentUser, selectedDate);
  const record = fitnessData[currentUser].workouts[selectedDate];
  record.waterIntake = Math.max(0, (record.waterIntake || 0) + offsetMl);
  
  if (offsetMl > 0) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch(e) {}
  }
  
  saveData();
  evaluateMissionsAndBadges();
  renderCheckIn();
}

function adjustWaterIntakeTo(amountMl) {
  if (selectedDate > dateToYYYYMMDD(new Date())) {
    alert("Cannot log water for future dates.");
    return;
  }
  ensureDateRecord(currentUser, selectedDate);
  const record = fitnessData[currentUser].workouts[selectedDate];
  
  const previous = record.waterIntake || 0;
  record.waterIntake = amountMl;
  
  if (amountMl > previous) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(900, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1300, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch(e) {}
  }
  
  saveData();
  evaluateMissionsAndBadges();
  renderCheckIn();
}

function getCoachFeedback() {
  ensureDateRecord(currentUser, selectedDate);
  const record = fitnessData[currentUser].workouts[selectedDate];
  const workout = getWorkoutForDate(selectedDate);
  const total = workout.exercises.length;
  const completed = record.completedExercises.length;
  const skipped = record.skippedExercises ? record.skippedExercises.length : 0;
  const streak = calculateStreaks(currentUser).currentStreak;
  
  const isSunday = getWeekdayName(selectedDate) === "Sunday";
  const userDisplay = currentUser.toUpperCase();

  // Get diet details
  const dietData = getActiveDietData();
  let totalCals = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let hasDietLogged = false;

  if (dietData && dietData.meals && dietData.meals[selectedDate]) {
    const meals = dietData.meals[selectedDate];
    ["Breakfast", "Lunch", "EveningSnacks", "Dinner"].forEach(type => {
      const items = meals[type] || [];
      if (items.length > 0) {
        hasDietLogged = true;
      }
      items.forEach(f => {
        totalCals += f.k || 0;
        totalProtein += f.p || 0;
        totalCarbs += f.carb || 0;
        totalFat += f.f || 0;
      });
    });
  }

  const targetCals = (dietData && dietData.profile) ? dietData.profile.targetCalories : (currentUser === "aman" ? 2200 : 2300);
  
  // Get current weight
  const weights = fitnessData[currentUser].weights || {};
  const dates = Object.keys(weights).sort();
  const latestWeight = dates.length ? weights[dates[dates.length - 1]] : ((dietData && dietData.profile) ? dietData.profile.weight : (currentUser === "aman" ? 94.6 : 92.7));
  
  // Protein target calculation (g)
  const minProteinPerKg = 1.6;
  const targetProteinPerKg = 2.0;
  const minProteinTarget = Math.round(latestWeight * minProteinPerKg);
  const targetProtein = Math.round(latestWeight * targetProteinPerKg);

  // Helper to build structured HTML feedback
  function buildStructuredFeedback(workoutTitle, workoutVerdict, workoutPhysiology, workoutOrders, workoutColor, workoutIcon, workoutStatusText, dietTitle, dietVerdict, dietPhysiology, dietOrders, dietColor, dietIcon, dietStatusText) {
    const dietLogSnippet = hasDietLogged 
      ? `<div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; font-size: 11px;">
           <span style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); padding: 2px 6px; border-radius: 4px; color: var(--text-main);">🔥 <strong>${Math.round(totalCals)}</strong> / ${targetCals} kcal</span>
           <span style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); padding: 2px 6px; border-radius: 4px; color: var(--text-main);">🥩 <strong>${Math.round(totalProtein)}g</strong> / ${targetProtein}g Pro</span>
           <span style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); padding: 2px 6px; border-radius: 4px; color: var(--text-main);">🍚 <strong>${Math.round(totalCarbs)}g</strong> Carbs</span>
           <span style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); padding: 2px 6px; border-radius: 4px; color: var(--text-main);">🥑 <strong>${Math.round(totalFat)}g</strong> Fat</span>
         </div>`
      : `<div style="display: flex; align-items: center; gap: 6px; background: rgba(255, 42, 95, 0.05); border: 1px solid rgba(255, 42, 95, 0.15); padding: 4px 8px; border-radius: 6px; font-size: 11px; color: #ff2a5f; margin-bottom: 10px; font-style: normal;">
           🚨 <strong>NO NUTRITION DATA LOGGED FOR TODAY</strong>
         </div>`;

    return `
      <div class="coach-feedback-wrapper" style="font-style: normal; color: var(--text-main); font-size: 13px;">
        <!-- Top header -->
        <div style="display: flex; gap: 8px; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 6px; margin-bottom: 10px;">
          <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-sub);">Biochemical & Mechanical Sync</span>
          <span style="font-size: 10px; font-weight: 700; color: ${workoutColor};">Workout: ${workoutStatusText}</span>
        </div>
        
        <!-- Workout Section -->
        <div style="margin-bottom: 16px;">
          <div style="color: ${workoutColor}; font-weight: 700; font-size: 13px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <span>${workoutIcon}</span> <strong>${workoutTitle}</strong>
          </div>
          <div style="font-size: 12.5px; line-height: 1.45; color: var(--text-main); margin-bottom: 8px;">
            ${workoutVerdict}
          </div>
          <div style="font-size: 11.5px; color: var(--text-sub); background: rgba(255,255,255,0.015); border: 1px solid var(--border-color); padding: 8px 10px; border-radius: 6px; margin-bottom: 8px; line-height: 1.4;">
            <strong>🧬 Muscle Mechanics:</strong> ${workoutPhysiology}
          </div>
          <div style="font-size: 11.5px; color: var(--text-main); line-height: 1.4;">
            <strong>📋 Daily Directive:</strong> ${workoutOrders}
          </div>
        </div>

        <!-- Diet Section -->
        <div style="border-top: 1px dashed var(--border-color); padding-top: 12px; margin-top: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="color: ${dietColor}; font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span>${dietIcon}</span> <strong>${dietTitle}</strong>
            </div>
            <span style="font-size: 10px; font-weight: 700; color: ${dietColor};">Diet: ${dietStatusText}</span>
          </div>
          
          ${dietLogSnippet}
          
          <div style="font-size: 12.5px; line-height: 1.45; color: var(--text-main); margin-bottom: 8px;">
            ${dietVerdict}
          </div>
          <div style="font-size: 11.5px; color: var(--text-sub); background: rgba(255,255,255,0.015); border: 1px solid var(--border-color); padding: 8px 10px; border-radius: 6px; margin-bottom: 8px; line-height: 1.4;">
            <strong>🧬 Metabolic Pathways:</strong> ${dietPhysiology}
          </div>
          <div style="font-size: 11.5px; color: var(--text-main); line-height: 1.4;">
            <strong>📋 Nutrition Order:</strong> ${dietOrders}
          </div>
        </div>
      </div>
    `;
  }

  // 1. DETERMINE WORKOUT VARIABLES
  let workoutTitle = "";
  let workoutVerdict = "";
  let workoutPhysiology = "";
  let workoutOrders = "";
  let workoutColor = "var(--text-sub)";
  let workoutIcon = "ℹ️";
  let workoutStatusText = "NOT STARTED";

  if (isSunday) {
    workoutTitle = "Recovery Day Protocol";
    workoutVerdict = `Hey <strong>${userDisplay}</strong>! It's Sunday—your Recovery Day. Muscle tissue grows during rest, not during lifting. Use today to prepare for the upcoming split.`;
    workoutPhysiology = "Active recovery uregulates skeletal muscle blood flow without inducing mechanical micro-tears. This allows immune cells to clear necrotic tissue and deliver cytokines for muscle satellite cell proliferation. Furthermore, the central nervous system (CNS) restores acetylcholine pools and motor unit recruitment efficiency.";
    workoutOrders = "Perform active mobility work, stretch your joints, hydrate, and prepare your central nervous system for Monday's push!";
    workoutColor = "#00d9ff";
    workoutIcon = "🛌";
    workoutStatusText = "RECOVERY";
  } else if (total > 0) {
    if (completed === 0 && skipped > 0) {
      const skippedNames = record.skippedExercises.map(id => {
        const ex = workout.exercises.find(e => e.exerciseId === id);
        return ex ? ex.name : id;
      }).join(", ");

      workoutTitle = "Critical Discipline Breakdown";
      workoutVerdict = `🚨 <strong>YOU SKIPPED YOUR ENTIRE WORKOUT, ${userDisplay}.</strong> You checked off zero exercises and skipped the entire list: <em>${skippedNames}</em>. Zero load means zero stimulus.`;
      workoutPhysiology = "Without resistance training, muscle protein breakdown (MPB) immediately exceeds muscle protein synthesis (MPS). Over time, this leads directly to myofibrillar atrophy. Neural drive and motor unit recruitment efficiency decay, and active muscle GLUT4 transporters decondition, reducing glucose partitioning.";
      workoutOrders = "Tomorrow, you either repeat today's session in full before starting your next workout, or pay a heavy discipline tax of a 30-minute HIIT penalty circuit.";
      workoutColor = "#ff2a5f";
      workoutIcon = "🚨";
      workoutStatusText = "SKIPPED";
    } else if (skipped > 0) {
      const skippedIds = record.skippedExercises;
      const skippedNames = skippedIds.map(id => {
        const ex = workout.exercises.find(e => e.exerciseId === id);
        return ex ? ex.name : id;
      }).join(", ");

      workoutTitle = "Cherry-Picking Warning";
      workoutVerdict = `⚠️ <strong>CHERRY-PICKING DETECTED, ${userDisplay}!</strong> You completed ${completed} exercises but skipped: <em>[${skippedNames}]</em>. Skipping the movements you find difficult is how you build structural imbalances and chronic joint weaknesses.`;
      
      // Check what they skipped
      const skippedLegs = skippedIds.some(id => ["goblet-squat", "leg-press", "walking-lunges", "romanian-deadlift", "leg-curl", "calf-raise", "squat-variation", "hip-thrust", "leg-extension", "barbell-squat", "bulgarian-split-squat", "deadlift"].includes(id));
      const skippedBack = skippedIds.some(id => ["lat-pulldown", "db-row", "seated-row", "face-pulls", "rear-delt-fly", "pull-ups", "barbell-row"].includes(id));
      const skippedPush = skippedIds.some(id => ["push-ups", "db-bench-press", "incline-db-press", "chest-fly", "db-shoulder-press", "front-raises", "upright-row", "shrugs", "tricep-pushdown", "overhead-tricep-ext", "rope-tricep-pushdown", "barbell-bench-press", "dips", "overhead-press", "cable-lateral-raise", "cable-overhead-extension"].includes(id));
      const skippedCore = skippedIds.some(id => ["plank", "leg-raises", "dead-bug", "side-plank", "hanging-leg-raise", "russian-twist", "ab-wheel-rollout"].includes(id));

      if (skippedLegs) {
        workoutPhysiology = "Compound leg movements recruit the largest motor units. Skipping posterior work (like Deadlifts/Hamstrings) while training quads creates a severe muscle imbalance. The gluteus maximus is your body's primary extension engine; when it is dormant, shear stress transfers directly to your lumbar spine, causing chronic lower back pain.";
        workoutOrders = "Perform 50 deep bodyweight squats and 2 minutes of wall sits in your room tonight to activate those dormant glutes and quads.";
      } else if (skippedBack) {
        workoutPhysiology = "Skipping pulling movements leads to structural imbalance. Training chest/shoulders (pushing) without back work pulls your shoulders forward, stretching and weakening scapular retractors (rhomboids and lower traps), causing hunched 'desk posture' and rotator cuff impingement.";
        workoutOrders = "Complete 3 sets of door-frame bodyweight rows or maximum pull-ups at home tonight to pull those shoulders back into proper alignment.";
      } else if (skippedPush) {
        workoutPhysiology = "Neglecting horizontal and vertical presses leaves your pectoralis major and anterior deltoids understimulated. This creates upper-body asymmetry where your posterior pulling muscles aren't balanced by front-side stabilization, reducing pushing power.";
        workoutOrders = "Complete 4 sets of maximum pushups to failure at home tonight to log that missing pushing volume.";
      } else if (skippedCore) {
        workoutPhysiology = "Your core acts as a natural weightlifting belt. Without core activation, you cannot brace your spine under load, transferring heavy shear forces directly onto your lumbar vertebrae, increasing the risk of herniated discs.";
        workoutOrders = "Perform a 4-minute plank circuit (1 min plank, 45s side planks, 1 min plank) and 60 bicycle crunches before bed.";
      } else {
        workoutPhysiology = "Skipping these movements breaks your training frequency. Muscles require stimulation every 48 to 72 hours to optimize protein synthesis. Skipping a movement resets your progress clock, putting you in a loop of constant soreness without adaptation.";
        workoutOrders = "Perform 4 sets of maximum effort pushups or bodyweight squats tonight to make up for the skipped movement volume.";
      }

      workoutColor = "#ffb703";
      workoutIcon = "⚠️";
      workoutStatusText = "INCOMPLETE";
    } else if (completed === total) {
      workoutTitle = "Absolute Mechanical Domination";
      workoutVerdict = `👑 <strong>A PERFECT CARD, ${userDisplay}!</strong> You walked in, faced the daily plan, and checked off all ${total} exercises without a single skip. You chose temporary exertion over comfortable stagnation.`;
      workoutPhysiology = "By completing the full workout, you've stimulated protein synthesis, elevated your resting metabolism, and triggered positive neuromuscular adaptations. Ribosomal activity is highly upregulated, and insulin sensitivity in trained muscle cells is at its peak.";
      workoutOrders = "Focus on recovery now. Keep your hydration levels high, stretch, and get quality sleep. Rest is when the actual repair and hypertrophy occurs.";
      workoutColor = "#00ff88";
      workoutIcon = "👑";
      workoutStatusText = "COMPLETED";
    } else {
      // Partial completion but no skips logged yet
      const completedIds = record.completedExercises;
      const completedNames = completedIds.map(id => {
        const ex = workout.exercises.find(e => e.exerciseId === id);
        return ex ? ex.name : id;
      });

      workoutTitle = "Building Mechanical Momentum";
      if (completed === 1) {
        workoutVerdict = `💪 <strong>FIRST STEP LOGGED, ${userDisplay}!</strong> You checked off your first exercise: <strong>${completedNames[0]}</strong>. You have broken the inertia of sitting down.`;
      } else if (completed === 2) {
        workoutVerdict = `🔥 <strong>BUILDING MOMENTUM, ${userDisplay}!</strong> Two exercises logged: <em>${completedNames.join(", ")}</em>. Your blood is flowing and your joints are lubricated.`;
      } else if (completed === 3) {
        workoutVerdict = `⚡ <strong>YOU'RE IN THE ZONE, ${userDisplay}!</strong> Three exercises checked off: <em>${completedNames.join(", ")}</em>. You are officially in the rhythm now.`;
      } else if (completed === 4) {
        workoutVerdict = `🚀 <strong>RESPECT THE WORK, ${userDisplay}!</strong> Four exercises completed: <em>${completedNames.join(", ")}</em>. Pushing through multiple movements requires grit.`;
      } else {
        workoutVerdict = `🌟 <strong>ELITE DRIVE, ${userDisplay}!</strong> Incredible progress! You've completed <strong>${completed} out of ${total}</strong> movements. You're in the home stretch.`;
      }

      // Add Trainer Pro-Tip combos as part of the workout physiology
      const hasShoulderCombo = completedIds.includes("db-shoulder-press") && completedIds.includes("lateral-raises");
      const hasChestCombo = completedIds.includes("db-bench-press") && (completedIds.includes("incline-db-press") || completedIds.includes("chest-fly"));
      const hasBackCombo = completedIds.includes("lat-pulldown") && completedIds.includes("db-row");
      const hasLegCombo = completedIds.includes("goblet-squat") && completedIds.includes("leg-press");
      const hasArmCombo = completedIds.includes("db-curl") && completedIds.includes("hammer-curl");
      const hasRdlCombo = completedIds.includes("romanian-deadlift") && completedIds.includes("leg-curl");
      const hasCoreCombo = completedIds.includes("plank") && (completedIds.includes("leg-raises") || completedIds.includes("dead-bug"));

      if (hasShoulderCombo) {
        workoutPhysiology = "OVERHEAD PRESS & LATERAL RAISE COMBO: The overhead press builds heavy mass on the anterior head, while the lateral raise isolates the lateral head, creating physical width. This V-taper balances the physique. Keep your pinky fingers slightly high on raises!";
      } else if (hasChestCombo) {
        workoutPhysiology = "DUMBBELL PRESS & INCLINE/FLY COMBO: You are targeting both the lower sternal head and the upper clavicular head of your chest. The incline work is what fills out the upper chest. Retract your scapula to protect your front delts!";
      } else if (hasBackCombo) {
        workoutPhysiology = "LAT PULLDOWN & ONE-ARM ROW COMBO: Vertical and horizontal pulling synergy. Pulldowns stretch and widen your lats, while dumbbell rows build deep density in the mid-traps and rhomboids. Lead with your elbows!";
      } else if (hasLegCombo) {
        workoutPhysiology = "SQUAT & LEG PRESS COMBO: Leg training stimulates the largest muscle groups, triggering a systemic release of anabolic hormones that benefits your entire body. Drive through your heels, and never lock out knees!";
      } else if (hasArmCombo) {
        workoutPhysiology = "BICEP CURL & HAMMER CURL COMBO: Bicep curls build the biceps peak; hammer curls recruit the brachialis. Thickening the brachialis pushes the biceps upward, giving your arms a much wider look from the front and side.";
      } else if (hasRdlCombo) {
        workoutPhysiology = "ROMANIAN DEADLIFT & LEG CURL COMBO: Hamstring and glute gold. The RDL trains hip hinge mechanics under load, while the leg curl isolates knee flexion. Balancing your hamstrings with your quads prevents knee pain.";
      } else if (hasCoreCombo) {
        workoutPhysiology = "PLANK & LEG RAISES COMBO: The plank trains isometric spinal bracing, while raises work the lower abdominal wall and hip flexors. A braced core acts like a lifting belt, preventing lower back fatigue.";
      } else {
        workoutPhysiology = "Every set completed is a mechanical stimulus that uregulates the protein translation machinery. Even a partial workout keeps the anabolic signal active compared to complete dormancy.";
      }

      workoutOrders = "Maintain perfect form on your remaining movements. Let's finish the workout card and lock in those gains!";
      workoutColor = "#00d9ff";
      workoutIcon = "⚡";
      workoutStatusText = "IN PROGRESS";
    }
  } else {
    workoutTitle = "Scheduled Rest Day";
    workoutVerdict = `Listen up, <strong>${userDisplay}</strong>. Today is a rest day. Your streak stands at <strong>${streak} Days</strong>. Recovery is where muscle grows.`;
    workoutPhysiology = "Rest days are when supercompensation occurs. Muscle glycogen levels are fully restored, and the endocrine system stabilizes, lowering cortisol and normalizing anabolic hormone pathways.";
    workoutOrders = "Stay mobile. Perform active stretching, keep hydrated, and do not treat a rest day as an excuse for general physical decay.";
    workoutColor = "#00d9ff";
    workoutIcon = "🛌";
    workoutStatusText = "REST DAY";
  }

  // 2. DETERMINE DIET VARIABLES
  let dietTitle = "Nutrition Tracking";
  let dietVerdict = "";
  let dietPhysiology = "";
  let dietOrders = "";
  let dietColor = "var(--text-sub)";
  let dietIcon = "ℹ️";
  let dietStatusText = "PENDING";

  // Check week days and workout types
  const weekday = getWeekdayName(selectedDate);
  const isHeavyWorkoutDay = ["Monday", "Tuesday", "Thursday", "Friday", "Saturday"].includes(weekday);

  if (!hasDietLogged) {
    dietTitle = "Nutrition Blackout";
    dietVerdict = `You logged zero foods today, ${userDisplay}. Muscle building is a two-part equation: mechanical loading initiates the hypertrophy signal, but biochemical building blocks construct the tissue. By training and not tracking, you are guessing.`;
    dietPhysiology = "Without nutritional tracking, you risk entering a caloric or amino acid deficit. Skeletal muscle relies on a steady state of plasma amino acids (hyper-aminoacidemia) to sustain muscle protein synthesis (MPS). Flying blind disables our ability to adjust macronutrient ratios to your activity level.";
    dietOrders = "Open the Diet tab right now and log every single thing you ate today. No excuses.";
    dietColor = "#ff2a5f";
    dietIcon = "🚨";
    dietStatusText = "UNTRACKED";
  } else if (isSunday) {
    if (totalProtein < minProteinTarget) {
      dietTitle = "Recovery Blocked";
      dietVerdict = `It's Sunday, but your body doesn't stop rebuilding. You logged only ${Math.round(totalProtein)}g of protein, which is below your minimum threshold of ${minProteinTarget}g.`;
      dietPhysiology = "During recovery, myofibrillar protein synthesis remains elevated to repair micro-tears in sarcomeres. Lacking amino acids forces the body to prioritize internal organ repair, blunting the supercompensation curve of yesterday's training.";
      dietOrders = "Consume a high-quality protein source immediately (whey, eggs, meat, or soy) to hit at least 40g of protein in your next meal.";
      dietColor = "#ff2a5f";
      dietIcon = "🚨";
      dietStatusText = "DEFICIENT PROTEIN";
    } else {
      dietTitle = "Optimal Reconstruction";
      dietVerdict = `Excellent Sunday nutrition. You logged ${Math.round(totalCals)} calories and ${Math.round(totalProtein)}g of protein. You are feeding the machine during the crucial repair phase.`;
      dietPhysiology = "Sustained high amino acid availability on rest days maintains positive nitrogen balance. Glycogen stores are being fully saturated using complex carbohydrates, increasing intracellular water retention (cell swelling), which signals cellular growth.";
      dietOrders = "Keep hydration above 3 liters today. Get ready for Monday's heavy chest and shoulder session.";
      dietColor = "#00ff88";
      dietIcon = "✅";
      dietStatusText = "OPTIMAL NUTRITION";
    }
  } else {
    // Weekdays
    const isWorkoutDone = completed > 0;
    const isWorkoutSkipped = (total > 0 && completed === 0);

    if (isWorkoutSkipped && totalCals >= targetCals) {
      dietTitle = "Unearned Caloric Surplus";
      dietVerdict = `You ate like an elite athlete today, ${userDisplay}, but trained like a spectator. You completed 0 exercises but logged ${Math.round(totalCals)} kcal. This surplus was not earned.`;
      dietPhysiology = "Without mechanical load, skeletal muscle cells do not stimulate the translocation of GLUT4 glucose transporters. Excess glucose and lipids circulate in the blood, triggering insulin to drive them directly into adipose tissue (fat stores) instead of muscle.";
      dietOrders = "Cut carbs by 50% for the rest of today. Perform a 30-minute HIIT penalty circuit tomorrow before you lift.";
      dietColor = "#ff2a5f";
      dietIcon = "🚨";
      dietStatusText = "SURPLUS SPILLOVER";
    } else if (isWorkoutDone && totalProtein < minProteinTarget) {
      dietTitle = "Anabolic Failure";
      dietVerdict = `You completed your training, ${userDisplay}, but failed your nutrition. You logged only ${Math.round(totalProtein)}g of protein, which is far below your minimum anabolic threshold of ${minProteinTarget}g.`;
      dietPhysiology = "Resistance training uregulates the intracellular mTORC1 pathway through mechanical tension. However, translation initiation (the actual assembly of new muscle proteins) is completely dependent on intracellular amino acid concentrations—specifically leucine. When leucine is low, the sensor Sestrin2 remains bound, blocking mTORC1. In this state, muscle protein breakdown (MPB) overrides synthesis, rendering your workout catabolic.";
      dietOrders = "Ingest 40-50g of rapidly absorbing protein (whey or egg whites) immediately, followed by a whole-food protein meal within 2 hours.";
      dietColor = "#ff2a5f";
      dietIcon = "🚨";
      dietStatusText = "DEFICIENT PROTEIN";
    } else if (isWorkoutDone && isHeavyWorkoutDay && (totalCarbs < 120 || totalCals < targetCals * 0.6)) {
      dietTitle = "Glycogen Depletion";
      dietVerdict = `You finished a heavy compound session today, ${userDisplay}, but starved your body of energy. Logging only ${Math.round(totalCarbs)}g of carbs will flatline your recovery and leave you depleted.`;
      dietPhysiology = "Heavy compound lifts (squats, pulls, presses) rely on anaerobic glycolysis, draining intramuscular glycogen. Low carbs post-workout keeps cortisol (a highly catabolic hormone) elevated. Cortisol triggers gluconeogenesis, breaking down muscle tissue to stabilize blood sugar. Furthermore, low glycogen reduces sarcoplasmic hydration (loss of muscle pump), blunting cell-volume-mediated anabolic signaling.";
      dietOrders = "Consume 80-100g of clean carbohydrates (rice, oats, potato) immediately to spike insulin and halt cortisol-induced catabolism.";
      dietColor = "#ffb703";
      dietIcon = "⚠️";
      dietStatusText = "LOW CARBOHYDRATES";
    } else if (isWorkoutDone && totalCals > targetCals + 500) {
      dietTitle = "Caloric Overflow";
      dietVerdict = `You trained, but your calorie intake (${Math.round(totalCals)} kcal) is in an excessive surplus (+${Math.round(totalCals - targetCals)} kcal above target). Your body has a hard physiological limit on how much muscle it can build.`;
      dietPhysiology = "Hypertrophy is constrained by ribosomal capacity and satellite cell donation. Any surplus exceeding 200-300 kcal does not increase muscle protein synthesis; instead, it is diverted to adipose tissue via de novo lipogenesis. Excessive surplus also increases systemic inflammation and decreases insulin sensitivity over time.";
      dietOrders = "Drop your carbohydrate and fat intake by 20% tomorrow to offset the surplus. Keep protein high.";
      dietColor = "#ffb703";
      dietIcon = "⚠️";
      dietStatusText = "EXCESS SURPLUS";
    } else if (isWorkoutDone && totalProtein >= minProteinTarget && totalCals >= targetCals * 0.8 && totalCals <= targetCals + 300) {
      dietTitle = "Golden Hypertrophic Synergy";
      dietVerdict = `Absolute perfection, ${userDisplay}. You completed your workout and fueled it with ${Math.round(totalProtein)}g of protein and ${Math.round(totalCals)} kcal. This is how champions are built.`;
      dietPhysiology = "You have matched mechanical stimulus with biochemical substrate. Hyper-aminoacidemia is triggering muscle protein synthesis (MPS), while adequate carbohydrates are restoring glycogen pools, creating intracellular osmotic pressure (cell swelling) that uregulates cellular growth pathways.";
      dietOrders = "Ensure you get 8 hours of quality sleep tonight to maximize growth hormone release. Repeat this tomorrow.";
      dietColor = "#00ff88";
      dietIcon = "✅";
      dietStatusText = "OPTIMAL NUTRITION";
    } else {
      // Default normal diet logged
      dietTitle = "On-Track Nutrition";
      dietVerdict = `Your nutrition is solid today, ${userDisplay}. You logged ${Math.round(totalCals)} kcal and ${Math.round(totalProtein)}g of protein. Keep up this consistency.`;
      dietPhysiology = "Keeping nutrients within your metabolic targets ensures you maintain a positive nitrogen balance without excess fat spillover. Consistent macro adherence is the foundation of long-term body recomposition.";
      dietOrders = "Maintain your current hydration levels and log your meals early tomorrow.";
      dietColor = "#00d9ff";
      dietIcon = "✅";
      dietStatusText = "IN RANGE";
    }
  }

  return buildStructuredFeedback(
    workoutTitle, workoutVerdict, workoutPhysiology, workoutOrders, workoutColor, workoutIcon, workoutStatusText,
    dietTitle, dietVerdict, dietPhysiology, dietOrders, dietColor, dietIcon, dietStatusText
  );
}

function evaluateMissionsAndBadges() {
  ensureDateRecord(currentUser, selectedDate);
  const record = fitnessData[currentUser].workouts[selectedDate];
  const workout = getWorkoutForDate(selectedDate);
  const totalEx = workout.exercises.length;
  const compEx = record.completedExercises.length;
  
  // 1. Evaluate workout mission
  const workoutMissionMet = (totalEx > 0 && compEx === totalEx);
  
  // 2. Evaluate diet mission
  const dietData = getActiveDietData();
  let dietMissionMet = false;
  if (dietData && dietData.meals && dietData.meals[selectedDate]) {
    const meals = dietData.meals[selectedDate];
    let mealCountWithFoods = 0;
    ["Breakfast", "Lunch", "EveningSnacks", "Dinner"].forEach(type => {
      if (meals[type] && meals[type].length > 0) {
        mealCountWithFoods++;
      }
    });
    dietMissionMet = (mealCountWithFoods >= 3);
  }
  
  // 3. Evaluate water mission
  const waterMissionMet = (record.waterIntake >= 3500);
  
  record.missions = {
    workout: workoutMissionMet,
    diet: dietMissionMet,
    water: waterMissionMet
  };
  
  // Evaluate Badges
  const badges = fitnessData[currentUser].badges || [];
  let badgesUpdated = false;
  
  const streaks = getCachedStreaks(currentUser);
  if (streaks.currentStreak >= 3 && !badges.includes("consistent-crusader")) {
    badges.push("consistent-crusader");
    badgesUpdated = true;
  }
  
  if (streaks.currentStreak >= 7 && !badges.includes("gym-legend")) {
    badges.push("gym-legend");
    badgesUpdated = true;
  }
  
  if (!badges.includes("kitchen-master") && dietData && dietData.meals) {
    let activeDietDays = 0;
    const dates = Object.keys(dietData.meals);
    for (const d of dates) {
      const aggregates = getDietDateAggregates(dietData, currentUser, d);
      if (aggregates.calories > 0) {
        activeDietDays++;
        if (activeDietDays >= 3) break;
      }
    }
    if (activeDietDays >= 3) {
      badges.push("kitchen-master");
      badgesUpdated = true;
    }
  }
  
  if (!badges.includes("hydration-champ")) {
    let waterTargetDays = 0;
    const dates = Object.keys(fitnessData[currentUser].workouts);
    for (const d of dates) {
      const rec = fitnessData[currentUser].workouts[d];
      if (rec.waterIntake >= 3500) {
        waterTargetDays++;
        if (waterTargetDays >= 3) break;
      }
    }
    if (waterTargetDays >= 3) {
      badges.push("hydration-champ");
      badgesUpdated = true;
    }
  }
  
  const isFriday = getWeekdayName(selectedDate) === "Friday";
  if (isFriday && workoutMissionMet && !badges.includes("iron-discipline")) {
    badges.push("iron-discipline");
    badgesUpdated = true;
  }
  
  if (badgesUpdated) {
    fitnessData[currentUser].badges = badges;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [261.63, 329.63, 392.00, 523.25];
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + i * 0.1);
        osc.stop(audioCtx.currentTime + i * 0.1 + 0.3);
      });
    } catch(e) {}
    alert(`🏆 Congratulations! You unlocked a new achievement badge! Check the Trophy Room!`);
  }
  
  saveData();
}

// Render Premium Header Widget
function renderPremiumStatsStrip() {
  const data = getActiveDietData(); // Diet data
  const fitData = fitnessData[currentUser] || { workouts: {} }; // Fitness data
  
  // 1. Streak
  const streakVal = DOM.get("header-streak-val");
  if (streakVal) {
    const streak = getCachedStreaks(currentUser).currentStreak || 0;
    streakVal.textContent = `${streak} Day${streak === 1 ? "" : "s"}`;
  }
  
  // 2. Calories
  const calsVal = DOM.get("header-cals-val");
  if (calsVal) {
    const todayStr = dateToYYYYMMDD(new Date());
    const aggregates = getDietDateAggregates(data, currentUser, todayStr);
    const consumed = aggregates.calories;
    const target = data.profile ? data.profile.targetCalories : 2200;
    calsVal.textContent = `${consumed} / ${target} kcal`;
  }
  
  // 3. Water
  const waterVal = DOM.get("header-water-val");
  if (waterVal) {
    const todayStr = dateToYYYYMMDD(new Date());
    const water = (fitData.workouts && fitData.workouts[todayStr]) ? (fitData.workouts[todayStr].waterIntake || 0) : 0;
    waterVal.textContent = `${water} / 3500 ml`;
  }
  
  // 4. Workout progress
  const workoutVal = DOM.get("header-workout-val");
  if (workoutVal) {
    const todayStr = dateToYYYYMMDD(new Date());
    const workout = getWorkoutForDate(todayStr);
    let completed = 0;
    let total = 0;
    if (workout && workout.exercises) {
      total = workout.exercises.length;
      if (fitData.workouts && fitData.workouts[todayStr]) {
        completed = fitData.workouts[todayStr].completedExercises ? fitData.workouts[todayStr].completedExercises.length : 0;
      }
    }
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    workoutVal.textContent = `${pct}% Done`;
  }
}

/* ==========================================================================
   15. ACTIVITY CENTER MODULE LOGIC
   ========================================================================== */

let activeActTab = "dash";
let currentRaceTarget = 5000;
let pendingNativePermissionPrompt = false;
let nativePermissionRequestedThisSession = false;

function requestNativeActivitySync(allowPermissionPrompt = false) {
  if (typeof AndroidApp === "undefined" || !AndroidApp.getHealthConnectStatus) return;
  if (!selectedDate || !authenticatedUser || currentUser !== authenticatedUser) return;
  pendingNativePermissionPrompt = pendingNativePermissionPrompt || allowPermissionPrompt;
  AndroidApp.getHealthConnectStatus();
}

function onNativeHealthStatus(status) {
  if (!status || !status.available) return;
  if (status.permissionsGranted) {
    pendingNativePermissionPrompt = false;
    if (AndroidApp.getActivityHistory) AndroidApp.getActivityHistory(selectedDate, 7);
    else if (AndroidApp.getDailyActivity) AndroidApp.getDailyActivity(selectedDate);
  } else if (pendingNativePermissionPrompt && !nativePermissionRequestedThisSession) {
    nativePermissionRequestedThisSession = true;
    pendingNativePermissionPrompt = false;
    if (AndroidApp.requestHealthPermissions) AndroidApp.requestHealthPermissions();
  }
}

function onNativeAppResumed() {
  if (activePage === "activity") requestNativeActivitySync(false);
  
  // Clear any pending chat notifications when the app is resumed
  if (typeof AndroidApp !== "undefined" && AndroidApp.clearChatNotifications) {
    try {
      AndroidApp.clearChatNotifications();
    } catch (_) {}
  }
}

function onNativeActivityData(data, options = {}) {
  if (!data || !data.ok || !isWithinSubscription(data.date)) return false;
  if (!authenticatedUser || currentUser !== authenticatedUser) return;

  const dataDate = data.date;
  ensureDateRecord(currentUser, dataDate);
  const act = fitnessData[currentUser].activityData;
  const previous = act.movement[dataDate] || {};
  const hasNativeMovement = (data.origins && data.origins.length > 0) ||
    data.steps > 0 || data.distanceKm != null || data.activeCalories != null ||
    data.activeMinutes > 0 || data.floors != null;

  if (hasNativeMovement || previous.source === "health_connect") {
    act.movement[dataDate] = {
      ...previous,
      steps: Math.max(0, Number(data.steps) || 0),
      distance: data.distanceKm == null ? null : Math.max(0, Number(data.distanceKm) || 0),
      activeMinutes: Math.max(0, Number(data.activeMinutes) || 0),
      activeCalories: data.activeCalories == null ? null : Math.max(0, Number(data.activeCalories) || 0),
      floors: data.floors == null ? null : Math.max(0, Number(data.floors) || 0),
      source: "health_connect",
      updatedAt: data.syncedAt,
      zoneId: data.zoneId,
      origins: data.origins || []
    };
  }

  if (Number(data.sleepMinutes) > 0) {
    const duration = Number(data.sleepMinutes) / 60;
    const priorSleep = act.sleep[dataDate] || {};
    act.sleep[dataDate] = {
      ...priorSleep,
      duration: Number(duration.toFixed(2)),
      score: Math.min(100, Math.round((duration / 8) * 100)),
      source: "health_connect",
      sessions: Number(data.sleepSessions) || 0,
      updatedAt: data.syncedAt
    };
  }

  if (data.weightKg != null && Number(data.weightKg) > 0) {
    fitnessData[currentUser].weights[dataDate] = Number(Number(data.weightKg).toFixed(2));
  }
  if (data.bodyFatPercent != null && Number(data.bodyFatPercent) > 0) {
    act.body[dataDate] = {
      ...(act.body[dataDate] || {}),
      bodyFat: Number(Number(data.bodyFatPercent).toFixed(1)),
      source: "health_connect",
      updatedAt: data.syncedAt
    };
  }

  act.lastHealthConnectSync = data.syncedAt;
  if (options.deferSave) return true;
  saveData();
  if (dataDate === selectedDate) {
    evaluateActivityAchievements();
    renderActivityCenter();
  }
  return true;
}

function onNativeActivityHistory(items) {
  if (!Array.isArray(items)) return;
  let changed = false;
  items.forEach(item => {
    changed = onNativeActivityData(item, { deferSave: true }) || changed;
  });
  if (changed) {
    saveData();
    evaluateActivityAchievements();
    renderActivityCenter();
  }
}

// Sub-navigation tab switcher
function switchActSubTab(tabId) {
  activeActTab = tabId;
  const tabIds = ["dash", "comp", "awards", "feed"];
  tabIds.forEach(id => {
    const btn = DOM.get(`act-tab-btn-${id}`);
    if (btn) btn.classList.toggle("active", id === tabId);
    
    const panel = DOM.get(`act-sub-${id}`);
    if (panel) panel.classList.toggle("active", id === tabId);
  });
  if (tabId === "comp" || tabId === "feed") syncOpponentActivity();
  renderActivityCenter();
}

function closeActModal(modalId) {
  const modal = DOM.get(modalId);
  if (modal) modal.style.display = "none";
}

function showLogMovementModal() {
  ensureDateRecord(currentUser, selectedDate);
  const act = fitnessData[currentUser].activityData;
  const move = act.movement[selectedDate] || { steps: 0, distance: 0, activeMinutes: 0, floors: 0 };
  
  DOM.get("input-act-steps").value = move.steps || "";
  DOM.get("input-act-distance").value = move.distance || "";
  DOM.get("input-act-active").value = move.activeMinutes || "";
  DOM.get("input-act-floors").value = move.floors || "";
  
  DOM.get("act-movement-modal").style.display = "flex";
}

function saveActMovement() {
  ensureDateRecord(currentUser, selectedDate);
  const steps = parseInt(DOM.get("input-act-steps").value) || 0;
  const distance = parseFloat(DOM.get("input-act-distance").value) || 0;
  const active = parseInt(DOM.get("input-act-active").value) || 0;
  const floors = parseInt(DOM.get("input-act-floors").value) || 0;

  if (selectedDate > dateToYYYYMMDD(new Date())) {
    alert("Cannot log movement for a future date.");
    return;
  }
  if (steps < 0 || steps > 150000 || distance < 0 || distance > 300 || active < 0 || active > 1440 || floors < 0 || floors > 1000) {
    alert("One or more movement values are outside a realistic daily range.");
    return;
  }

  const act = fitnessData[currentUser].activityData;
  const oldSteps = (act.movement[selectedDate] || {}).steps || 0;
  act.movement[selectedDate] = {
    steps: Math.max(0, steps),
    distance: Math.max(0, distance),
    activeMinutes: Math.max(0, active),
    floors: Math.max(0, floors),
    source: "manual",
    updatedAt: new Date().toISOString()
  };

  // Earning XP based on new steps logged
  const stepsDelta = steps - oldSteps;
  if (stepsDelta > 0) {
    const xpReward = Math.round((stepsDelta / 1000) * 10);
    if (xpReward > 0) earnXP(xpReward, `Walked ${stepsDelta} steps`);
  }

  saveData();
  evaluateActivityAchievements();
  closeActModal("act-movement-modal");
  renderActivityCenter();
  if (typeof debouncedSync === 'function') debouncedSync();
}

function logMovementPreset(preset) {
  if (selectedDate > dateToYYYYMMDD(new Date())) {
    alert("Cannot log movement for a future date.");
    return;
  }
  ensureDateRecord(currentUser, selectedDate);
  const act = fitnessData[currentUser].activityData;
  const move = act.movement[selectedDate] || { steps: 0, distance: 0, activeMinutes: 0, floors: 0 };

  let addSteps = 0, addDistance = 0, addActive = 0;
  if (preset === 'morning') {
    addSteps = 3000; addDistance = 2.1; addActive = 25;
  } else if (preset === 'evening') {
    addSteps = 5000; addDistance = 3.5; addActive = 40;
  }

  act.movement[selectedDate] = {
    steps: (move.steps || 0) + addSteps,
    distance: parseFloat(((move.distance || 0) + addDistance).toFixed(2)),
    activeMinutes: (move.activeMinutes || 0) + addActive,
    floors: (move.floors || 0) + Math.round(addDistance * 2),
    source: "manual",
    updatedAt: new Date().toISOString()
  };

  earnXPOnce(`movement-preset:${selectedDate}:${preset}`, Math.round((addSteps / 1000) * 10), `Logged ${preset} walk`);
  saveData();
  evaluateActivityAchievements();
  renderActivityCenter();
  if (typeof debouncedSync === 'function') debouncedSync();
}

function showSleepLogModal() {
  ensureDateRecord(currentUser, selectedDate);
  const act = fitnessData[currentUser].activityData;
  const sleep = act.sleep[selectedDate] || { bedtime: "22:00", wakeTime: "06:00", quality: 3 };
  
  DOM.get("input-act-sleep-bed").value = sleep.bedtime || "22:00";
  DOM.get("input-act-sleep-wake").value = sleep.wakeTime || "06:00";
  DOM.get("input-act-sleep-quality").value = sleep.quality || 3;
  DOM.get("sleep-quality-lbl").textContent = `${sleep.quality || 3} / 5`;
  
  DOM.get("act-sleep-modal").style.display = "flex";
}

function saveActSleep() {
  ensureDateRecord(currentUser, selectedDate);
  const bedtime = DOM.get("input-act-sleep-bed").value;
  const wakeTime = DOM.get("input-act-sleep-wake").value;
  const quality = parseInt(DOM.get("input-act-sleep-quality").value) || 3;

  // Calculate sleep hours
  const bedParts = bedtime.split(":");
  const wakeParts = wakeTime.split(":");
  let bedMin = parseInt(bedParts[0]) * 60 + parseInt(bedParts[1]);
  let wakeMin = parseInt(wakeParts[0]) * 60 + parseInt(wakeParts[1]);
  
  let diffMin = wakeMin - bedMin;
  if (diffMin < 0) diffMin += 24 * 60; // slept overnight
  if (!bedtime || !wakeTime || diffMin < 30 || diffMin > 16 * 60) {
    alert("Enter a sleep period between 30 minutes and 16 hours.");
    return;
  }
  
  const duration = parseFloat((diffMin / 60).toFixed(1));
  const score = Math.round((duration / 8) * 70 + (quality / 5) * 30);
  const sleepScore = Math.min(100, score);

  const act = fitnessData[currentUser].activityData;
  act.sleep[selectedDate] = {
    bedtime, wakeTime, quality, duration, score: sleepScore,
    source: "manual", updatedAt: new Date().toISOString()
  };

  earnXPOnce(`sleep:${selectedDate}`, 40, "Logged Sleep Record");
  saveData();
  evaluateActivityAchievements();
  closeActModal("act-sleep-modal");
  renderActivityCenter();
  if (typeof debouncedSync === 'function') debouncedSync();
}

function showWeightLogModal() {
  ensureDateRecord(currentUser, selectedDate);
  const weights = fitnessData[currentUser].weights || {};
  const currentWeight = weights[selectedDate] || weights[START_DATE_STR] || getStartingWeight(currentUser);
  const act = fitnessData[currentUser].activityData;
  const body = act.body[selectedDate] || { bodyFat: 20, waist: 32 };
  
  DOM.get("input-act-weight").value = currentWeight || "";
  DOM.get("input-act-bodyfat").value = body.bodyFat || "";
  DOM.get("input-act-waist").value = body.waist || "";
  
  DOM.get("act-weight-modal").style.display = "flex";
}

function saveActWeight() {
  ensureDateRecord(currentUser, selectedDate);
  const weight = parseFloat(DOM.get("input-act-weight").value);
  const bodyFat = parseFloat(DOM.get("input-act-bodyfat").value) || 0;
  const waist = parseFloat(DOM.get("input-act-waist").value) || 0;

  if (!Number.isFinite(weight) || weight < 25 || weight > 350) {
    alert("Enter a valid weight between 25 kg and 350 kg.");
    return;
  }
  if (bodyFat < 0 || bodyFat > 70 || waist < 0 || waist > 100) {
    alert("Check the body-fat and waist values before saving.");
    return;
  }
  fitnessData[currentUser].weights[selectedDate] = Number(weight.toFixed(2));

  const act = fitnessData[currentUser].activityData;
  act.body[selectedDate] = {
    bodyFat, waist, source: "manual", updatedAt: new Date().toISOString()
  };

  earnXPOnce(`body:${selectedDate}`, 20, "Logged Weight & Stats");
  saveData();
  evaluateActivityAchievements();
  closeActModal("act-weight-modal");
  renderActivityCenter();
  if (typeof debouncedSync === 'function') debouncedSync();
}

function addActWater(offsetMl) {
  if (typeof adjustWaterIntake === 'function') {
    adjustWaterIntake(offsetMl);
    earnXPOnce(`water:${selectedDate}`, 5, "Logged daily hydration");
    saveData();
    renderActivityCenter();
  }
}

function setRaceTarget(val) {
  currentRaceTarget = [5000, 10000, 15000].includes(Number(val)) ? Number(val) : 5000;
  const raceUsers = [currentUser, getRivalUsername()].filter(Boolean);
  const race = { date: selectedDate, target: currentRaceTarget, status: "active", updatedAt: new Date().toISOString() };
  raceUsers.forEach(user => {
    ensureDateRecord(user, selectedDate);
    fitnessData[user].activityData.races.active = { ...race };
  });
  const buttons = [5000, 10000, 15000];
  buttons.forEach(v => {
    const btn = DOM.get(`race-target-btn-${v === 5000 ? "5k" : v === 10000 ? "10k" : "15k"}`);
    if (btn) btn.classList.toggle("active", v === val);
  });
  saveData();
  renderActivityCenter();
}

function getDailyActivityQuests(user, dateStr) {
  ensureDateRecord(user, dateStr);
  const userAct = fitnessData[user].activityData;
  const movement = userAct.movement[dateStr] || {};
  const workoutRecord = fitnessData[user].workouts[dateStr] || {};
  const scheduled = getWorkoutForDate(dateStr);
  const exerciseCount = scheduled.exercises ? scheduled.exercises.length : 0;
  const quests = [
    { id: "steps", name: "Walk 8,000 steps", current: Number(movement.steps) || 0, target: 8000, xp: 50 },
    { id: "water", name: "Drink 3.5L water", current: Number(workoutRecord.waterIntake) || 0, target: 3500, xp: 50 }
  ];
  if (exerciseCount > 0) {
    quests.push({
      id: "workout",
      name: "Complete daily workout",
      current: (workoutRecord.completedExercises || []).length,
      target: exerciseCount,
      xp: 80
    });
  }
  return quests;
}

function awardCompletedDailyQuests(user, dateStr) {
  let changed = false;
  getDailyActivityQuests(user, dateStr).forEach(quest => {
    if (quest.current >= quest.target) {
      changed = awardXPToUser(user, `quest:${dateStr}:${quest.id}`, quest.xp, `Completed: ${quest.name}`) || changed;
    }
  });
  return changed;
}

function finalizeStepsRace(amanSteps, rishitSteps, amanUser = currentUser, rishitUser = getRivalUsername()) {
  if (amanSteps < currentRaceTarget && rishitSteps < currentRaceTarget) return null;
  const winnerSlot = amanSteps === rishitSteps
    ? null
    : (amanSteps > rishitSteps ? "aman" : "rishit");
  if (!winnerSlot) return "tie";
  const winner = winnerSlot === "aman" ? amanUser : rishitUser;
  if (!winner) return winnerSlot;

  const eventKey = `race:${selectedDate}:${currentRaceTarget}`;
  const awarded = awardXPToUser(winner, eventKey, 200, `Won ${currentRaceTarget.toLocaleString()} step race`);
  const result = {
    date: selectedDate,
    target: currentRaceTarget,
    winner,
    amanSteps,
    rishitSteps,
    completedAt: new Date().toISOString()
  };

  [amanUser, rishitUser].filter(Boolean).forEach(user => {
    ensureDateRecord(user, selectedDate);
    const races = fitnessData[user].activityData.races;
    races.active = { ...result, status: "complete" };
    if (!races.history.some(item => item.date === result.date && item.target === result.target)) {
      races.history.unshift({ ...result });
      races.history = races.history.slice(0, 30);
    }
  });

  if (awarded) {
    addFeedEvent(winner, `Won the ${currentRaceTarget.toLocaleString()} step race! 🏁🏆`, "race-win");
    saveData();
  }
  return winnerSlot;
}

function earnXP(amount, actionLabel) {
  return awardXPToUser(currentUser, null, amount, actionLabel);
}

function awardXPToUser(user, eventKey, amount, actionLabel) {
  ensureDateRecord(user, selectedDate);
  const act = fitnessData[user].activityData;
  if (eventKey && act.xpEvents[eventKey]) return false;
  if (eventKey) act.xpEvents[eventKey] = new Date().toISOString();

  const safeAmount = Math.max(0, Math.round(Number(amount) || 0));
  if (!safeAmount) return false;
  const oldLevel = act.xp.level || 1;
  act.xp.total = Math.max(0, Number(act.xp.total) || 0) + safeAmount;
  act.xp.history.push({
    date: selectedDate,
    action: actionLabel,
    amount: safeAmount,
    timestamp: new Date().toISOString()
  });
  act.xp.history = act.xp.history.slice(-250);

  while (act.xp.total >= getXPThreshold(act.xp.level || 1)) {
    act.xp.level = (act.xp.level || 1) + 1;
  }

  if (act.xp.level > oldLevel) {
    // Play arpeggio scale sound
    if (user === currentUser && typeof playSoundArpeggio === 'function') {
      playSoundArpeggio();
    } else if (user === currentUser) {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
          setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
          }, i * 150);
        });
      } catch (e) {}
    }
    
    // Add to social feed
    const feedMsg = `${user.toUpperCase()} reached Level ${act.xp.level}! 🚀`;
    addFeedEvent(user, feedMsg, "level-up");
  }
  return true;
}

function earnXPOnce(eventKey, amount, actionLabel) {
  return awardXPToUser(currentUser, eventKey, amount, actionLabel);
}

function addFeedEvent(user, message, type) {
  ensureDateRecord("aman", selectedDate);
  ensureDateRecord("rishit", selectedDate);
  
  const amanAct = fitnessData["aman"].activityData;
  const rishitAct = fitnessData["rishit"].activityData;
  
  const newPost = {
    id: "feed-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
    username: user,
    message: message,
    type: type || "custom",
    timestamp: new Date().toISOString()
  };

  // Push to both feed arrays to sync state
  if (amanAct) {
    amanAct.feed.unshift(newPost);
    amanAct.feed = amanAct.feed.slice(0, 50);
  }
  if (rishitAct) {
    rishitAct.feed.unshift(newPost);
    rishitAct.feed = rishitAct.feed.slice(0, 50);
  }
}

function postToFeed() {
  const input = DOM.get("act-feed-msg-input");
  if (!input || !input.value.trim()) return;
  
  const brag = input.value.trim().slice(0, 240);
  addFeedEvent(currentUser, brag, "brag");
  input.value = "";
  saveData();
  renderActivityCenter();
  if (typeof debouncedSync === 'function') debouncedSync();
}

function escapeActivityText(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getXPThreshold(level) {
  return level * 100 + (level - 1) * 150;
}

function calculateActivityStreaks(user) {
  ensureDateRecord(user, selectedDate);
  const act = fitnessData[user].activityData;
  const workouts = fitnessData[user].workouts || {};
  
  // Calculate hydration streak, steps streak, sleep streak
  let hydrationStreak = 0, stepsStreak = 0, sleepStreak = 0;
  
  // Scan backwards from today (selectedDate)
  const d = new Date(`${selectedDate}T12:00:00`);
  let tempD = new Date(d);
  
  // Hydration streak scan
  for (let i = 0; i < 365; i++) {
    const ds = dateToYYYYMMDD(tempD);
    const w = workouts[ds] || {};
    if (w.waterIntake >= 3500) {
      hydrationStreak++;
    } else if (ds !== selectedDate) {
      break; // broken
    }
    tempD.setDate(tempD.getDate() - 1);
  }

  // Steps streak scan (target 8k steps)
  tempD = new Date(d);
  for (let i = 0; i < 365; i++) {
    const ds = dateToYYYYMMDD(tempD);
    const m = act.movement[ds] || {};
    if (m.steps >= 8000) {
      stepsStreak++;
    } else if (ds !== selectedDate) {
      break;
    }
    tempD.setDate(tempD.getDate() - 1);
  }

  // Sleep streak scan (7h+)
  tempD = new Date(d);
  for (let i = 0; i < 365; i++) {
    const ds = dateToYYYYMMDD(tempD);
    const s = act.sleep[ds] || {};
    if (s.duration >= 7) {
      sleepStreak++;
    } else if (ds !== selectedDate) {
      break;
    }
    tempD.setDate(tempD.getDate() - 1);
  }

  return {
    hydration: hydrationStreak,
    steps: stepsStreak,
    sleep: sleepStreak,
    workout: calculateStreaks(user).currentStreak
  };
}

function evaluateActivityAchievements() {
  ensureDateRecord(currentUser, selectedDate);
  const badges = fitnessData[currentUser].badges || [];
  const act = fitnessData[currentUser].activityData;
  
  let newlyUnlocked = [];

  // Define checks
  const checkUnlock = (badgeId, cond) => {
    if (cond && !badges.includes(badgeId)) {
      badges.push(badgeId);
      newlyUnlocked.push(badgeId);
    }
  };

  // 1. First Workout
  let hasWorkout = Object.keys(fitnessData[currentUser].workouts).some(d => {
    return (fitnessData[currentUser].workouts[d].completedExercises || []).length > 0;
  });
  checkUnlock("first-workout", hasWorkout);

  // 2. First 5K steps
  let has5k = Object.keys(act.movement).some(d => (act.movement[d].steps || 0) >= 5000);
  checkUnlock("first-5k", has5k);

  // 3. First 10K steps
  let has10k = Object.keys(act.movement).some(d => (act.movement[d].steps || 0) >= 10000);
  checkUnlock("first-10k", has10k);

  // 4. Hydration Hero
  const streaks = getCachedActivityStreaks(currentUser);
  checkUnlock("hydration-champ", streaks.hydration >= 3);

  // 5. Sleep Master
  checkUnlock("sleep-master", streaks.sleep >= 3);

  // 6. Level 5 Achieved
  checkUnlock("level-5", (act.xp.level || 1) >= 5);

  // 7. Perfect Week
  let perfectDays = 0;
  Object.keys(fitnessData[currentUser].workouts).forEach(d => {
    const w = getWorkoutForDate(d);
    const r = fitnessData[currentUser].workouts[d];
    if (w && w.exercises.length > 0 && r.completedExercises.length === w.exercises.length) {
      perfectDays++;
    }
  });
  checkUnlock("perfect-week", perfectDays >= 7);

  // Trigger rewards for new badge unlocks
  if (newlyUnlocked.length > 0) {
    earnXP(50 * newlyUnlocked.length, `Unlocked ${newlyUnlocked.length} Badges`);
    
    // Play sounds
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        setTimeout(() => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.2);
        }, i * 120);
      });
    } catch(e) {}

    // Add to social feed
    newlyUnlocked.forEach(badgeId => {
      addFeedEvent(currentUser, `${currentUser.toUpperCase()} unlocked the "${badgeId.replace("-", " ").toUpperCase()}" Badge! 🏆`, "badge-unlock");
    });
  }
}

function getLatestWeightOnOrBefore(user, dateStr) {
  const weights = (fitnessData[user] && fitnessData[user].weights) || {};
  const dates = Object.keys(weights).filter(date => date <= dateStr && Number(weights[date]) > 0).sort();
  return dates.length ? Number(weights[dates[dates.length - 1]]) : getStartingWeight(user);
}

// Main page renderer
function renderActivityCenter() {
  ensureDateRecord(currentUser, selectedDate);
  const act = fitnessData[currentUser].activityData;
  const storedRace = act.races && act.races.active;
  if (storedRace && storedRace.date === selectedDate && [5000, 10000, 15000].includes(Number(storedRace.target))) {
    currentRaceTarget = Number(storedRace.target);
  }
  [5000, 10000, 15000].forEach(target => {
    const suffix = target === 5000 ? "5k" : target === 10000 ? "10k" : "15k";
    const button = DOM.get(`race-target-btn-${suffix}`);
    if (button) button.classList.toggle("active", target === currentRaceTarget);
  });
  
  // Calculate daily data
  const move = act.movement[selectedDate] || { steps: 0, distance: 0, activeMinutes: 0, floors: 0 };
  const sleep = act.sleep[selectedDate] || { bedtime: "", wakeTime: "", quality: 0, duration: 0, score: 0 };
  const water = fitnessData[currentUser].workouts[selectedDate].waterIntake || 0;
  
  // Workout completion percentage
  const wSchedule = getWorkoutForDate(selectedDate);
  const completedList = fitnessData[currentUser].workouts[selectedDate].completedExercises || [];
  const totalEx = wSchedule.exercises ? wSchedule.exercises.length : 0;
  const workoutPct = totalEx > 0 ? Math.round((completedList.length / totalEx) * 100) : 0;
  if (awardCompletedDailyQuests(currentUser, selectedDate)) saveData();
  
  // Prefer Health Connect. The fallback uses the largest estimate to avoid double-counting.
  const estimatedCalories = Math.max(
    (Number(move.steps) || 0) * 0.035,
    (Number(move.activeMinutes) || 0) * 6,
    (workoutPct / 100) * 300
  );
  const activeCalories = move.activeCalories != null
    ? Math.round(Math.max(0, Number(move.activeCalories) || 0))
    : Math.round(estimatedCalories);
  const displayDistance = move.distance != null
    ? Math.max(0, Number(move.distance) || 0)
    : (Math.max(0, Number(move.steps) || 0) * 0.00075);

  // Update Header XP & Flame Streak
  const streaks = getCachedActivityStreaks(currentUser);
  DOM.get("act-lvl-val").textContent = act.xp.level || 1;
  const currentLvl = act.xp.level || 1;
  const threshold = getXPThreshold(currentLvl);
  const prevThreshold = currentLvl > 1 ? getXPThreshold(currentLvl - 1) : 0;
  const relativeXP = act.xp.total - prevThreshold;
  const relativeThreshold = threshold - prevThreshold;
  DOM.get("act-xp-text").textContent = `${relativeXP} / ${relativeThreshold} XP`;
  DOM.get("act-xp-bar").style.width = Math.min(100, Math.round((relativeXP / relativeThreshold) * 100)) + "%";

  const actStreakVal = DOM.get("act-streak-val");
  actStreakVal.textContent = `${streaks.workout} Days`;
  if (streaks.workout > 0) {
    DOM.get("act-streak-badge").classList.add("flame-active");
  } else {
    DOM.get("act-streak-badge").classList.remove("flame-active");
  }

  // Streak Risk Banner
  const isWorkoutDay = wSchedule.exercises && wSchedule.exercises.length > 0;
  const streakAlert = DOM.get("act-streak-alert");
  if (isWorkoutDay && completedList.length === 0 && streaks.workout > 0) {
    streakAlert.style.display = "flex";
  } else {
    streakAlert.style.display = "none";
  }

  // Update concentric activity rings
  const stepsPct = Math.min(1, move.steps / 10000);
  const activePct = Math.min(1, move.activeMinutes / 60);
  const calsPct = Math.min(1, activeCalories / 500);
  const waterPct = Math.min(1, water / 3500);

  DOM.get("ring-steps").style.strokeDashoffset = 439.82 - (stepsPct * 439.82);
  DOM.get("ring-active").style.strokeDashoffset = 351.85 - (activePct * 351.85);
  DOM.get("ring-calories").style.strokeDashoffset = 263.89 - (calsPct * 263.89);
  DOM.get("ring-water").style.strokeDashoffset = 175.92 - (waterPct * 175.92);

  DOM.get("legend-steps-val").textContent = Math.round(stepsPct * 100) + "%";
  DOM.get("legend-active-val").textContent = Math.round(activePct * 100) + "%";
  DOM.get("legend-calories-val").textContent = Math.round(calsPct * 100) + "%";
  DOM.get("legend-water-val").textContent = Math.round(waterPct * 100) + "%";

  // Transparent daily goal score; this is not a medical measurement.
  const sleepComp = sleep.duration > 0 ? Math.min(1, sleep.duration / 8) * 20 : 0;
  const stepsComp = stepsPct * 25;
  const workoutComp = (workoutPct / 100) * 20;
  const waterComp = waterPct * 15;
  const calorieComp = calsPct * 20;

  let healthScore = Math.round(sleepComp + stepsComp + workoutComp + waterComp + calorieComp);
  
  const scoreArc = DOM.get("health-score-arc");
  if (scoreArc) {
    const offset = 263.89 - (Math.min(100, healthScore) / 100 * 263.89);
    scoreArc.style.strokeDashoffset = offset;
  }
  
  DOM.get("act-health-score").textContent = healthScore;
  const scoreStatus = DOM.get("act-health-status");
  const scoreDesc = DOM.get("act-health-desc");
  
  if (healthScore >= 85) {
    scoreStatus.textContent = `${healthScore} / 100 — Excellent Day`;
    scoreStatus.style.color = "#00ff88";
    scoreDesc.textContent = "You are making excellent progress across today's goals.";
  } else if (healthScore >= 70) {
    scoreStatus.textContent = `${healthScore} / 100 — Good Day`;
    scoreStatus.style.color = "#00d9ff";
    scoreDesc.textContent = "Keep going—you are close to completing today's goals.";
  } else if (healthScore >= 50) {
    scoreStatus.textContent = `${healthScore} / 100 — Needs Action`;
    scoreStatus.style.color = "#ffb703";
    scoreDesc.textContent = "A walk, workout, hydration, or sleep log can lift this score.";
  } else {
    scoreStatus.textContent = `${healthScore} / 100 — Getting Started`;
    scoreStatus.style.color = "#ff2a5f";
    scoreDesc.textContent = "Complete a few daily goals to build momentum.";
  }

  // Update Daily Snapshot
  DOM.get("snap-steps").textContent = move.steps.toLocaleString();
  DOM.get("snap-distance").textContent = displayDistance.toFixed(1) + " km";
  DOM.get("snap-calories").textContent = activeCalories + " kcal";
  DOM.get("snap-active").textContent = move.activeMinutes + " m";
  DOM.get("snap-workout").textContent = workoutPct + "%";
  DOM.get("snap-water").textContent = water + " ml";

  const weightRecord = getLatestWeightOnOrBefore(currentUser, selectedDate);
  DOM.get("snap-weight").textContent = weightRecord ? weightRecord + " kg" : "-- kg";

  // Panel-specific rendering
  if (activeActTab === "dash") {
    // Hydration Panel
    DOM.get("act-water-streak").textContent = `${streaks.hydration} Day Streak`;
    DOM.get("act-water-progress-text").textContent = `${water} / 3500 ml`;
    
    // Movement Panel
    DOM.get("act-steps-progress").textContent = `${move.steps} / 10000`;
    DOM.get("act-active-progress").textContent = `${move.activeMinutes} / 60m`;
    const syncStatus = DOM.get("act-health-sync-status");
    if (syncStatus) {
      if (move.source === "health_connect") {
        syncStatus.textContent = "Health Connect";
        syncStatus.style.color = "#00ff88";
        syncStatus.title = move.updatedAt ? `Last synced ${new Date(move.updatedAt).toLocaleString()}` : "Synced from Health Connect";
      } else {
        syncStatus.textContent = "Manual";
        syncStatus.style.color = "var(--text-sub)";
        syncStatus.title = "Manual activity record";
      }
    }
    
    // Sleep Panel
    const sleepDur = DOM.get("act-sleep-duration-text");
    const sleepStars = DOM.get("act-sleep-quality-stars");
    if (sleep.duration > 0) {
      sleepDur.textContent = `${Math.floor(sleep.duration)}h ${Math.round((sleep.duration % 1) * 60)}m logged`;
      const quality = Math.max(0, Math.min(5, Number(sleep.quality) || 0));
      sleepStars.textContent = quality > 0
        ? "★".repeat(quality) + "☆".repeat(5 - quality)
        : "Synced from Health Connect";
      DOM.get("act-sleep-score-val").textContent = sleep.score;
    } else {
      sleepDur.textContent = "No sleep logged";
      sleepStars.textContent = "☆☆☆☆☆";
      DOM.get("act-sleep-score-val").textContent = "--";
    }
    
    // Recovery estimate based on available habits; intentionally non-medical.
    const sleepDurationScore = Math.min(1, (Number(sleep.duration) || 0) / 8) * 70;
    const sleepQualityScore = Number(sleep.quality) > 0 ? (Number(sleep.quality) / 5) * 15 : 10;
    const hydrationScore = Math.min(1, water / 3500) * 10;
    const strainAdjustment = move.activeMinutes > 120 ? 0 : move.activeMinutes > 0 ? 5 : 3;
    const recoveryScore = Math.round(Math.max(0, Math.min(100,
      sleepDurationScore + sleepQualityScore + hydrationScore + strainAdjustment
    )));
    
    const recVal = DOM.get("act-recovery-score-val");
    if (sleep.duration > 0) {
      recVal.textContent = recoveryScore + "%";
      if (recoveryScore >= 80) recVal.style.color = "#00ff88";
      else if (recoveryScore >= 50) recVal.style.color = "#ffb703";
      else recVal.style.color = "#ff2a5f";
    } else {
      recVal.textContent = "--";
      recVal.style.color = "var(--text-sub)";
    }

    // Weight progress
    const wGoal = fitnessData[currentUser].goalWeight || 80.0;
    const wStart = getStartingWeight(currentUser);
    DOM.get("act-current-weight").textContent = weightRecord ? weightRecord + " kg" : "-- kg";
    DOM.get("act-goal-weight").textContent = wGoal;
    DOM.get("act-goal-weight-2").textContent = wGoal;
    DOM.get("act-start-weight").textContent = wStart;
    
    const bodyAct = act.body[selectedDate] || { bodyFat: 0, waist: 0 };
    DOM.get("act-bodyfat-val").textContent = bodyAct.bodyFat > 0 ? bodyAct.bodyFat + " %" : "-- %";
    DOM.get("act-waist-val").textContent = bodyAct.waist > 0 ? bodyAct.waist + " in" : "-- in";

    const delta = weightRecord - wStart;
    const deltaText = DOM.get("act-weight-delta-msg");
    if (delta > 0) {
      deltaText.textContent = `+${delta.toFixed(1)} kg gain`;
      deltaText.style.color = "#ff2a5f";
    } else if (delta < 0) {
      deltaText.textContent = `${delta.toFixed(1)} kg lost`;
      deltaText.style.color = "#00ff88";
    } else {
      deltaText.textContent = "Maintain";
      deltaText.style.color = "var(--text-sub)";
    }

    // Draw weight bar fill
    const range = Math.abs(wStart - wGoal);
    const weightBar = DOM.get("weight-progress-fill");
    if (range > 0 && weightRecord) {
      const done = Math.abs(weightRecord - wStart);
      const pct = Math.min(100, Math.round((done / range) * 100));
      weightBar.style.width = pct + "%";
    } else {
      weightBar.style.width = "0%";
    }

    // Draw Trends
    renderActivityTrends();
  }
  else if (activeActTab === "comp") {
    // Competition tab
    const amanUser = currentUser;
    const configuredRival = getRivalUsername();
    const rishitUser = configuredRival || "__rival__";
    ensureDateRecord(amanUser, selectedDate);
    ensureDateRecord(rishitUser, selectedDate);
    const amanAct = fitnessData[amanUser].activityData;
    const rishitAct = fitnessData[rishitUser].activityData;
    const selfName = authenticatedProfile?.display_name || amanUser;
    const rivalName = configuredRival || "Choose Rival";
    const title = DOM.get("comp-arena-title");
    if (title) title.textContent = `Brother Arena: ${selfName} vs. ${rivalName}`;
    const selfLabel = DOM.get("comp-name-aman");
    const rivalLabel = DOM.get("comp-name-rishit");
    const raceSelfLabel = DOM.get("race-name-aman");
    const raceRivalLabel = DOM.get("race-name-rishit");
    if (selfLabel) selfLabel.textContent = selfName;
    if (rivalLabel) rivalLabel.textContent = rivalName;
    if (raceSelfLabel) raceSelfLabel.textContent = `${selfName}🏃`;
    if (raceRivalLabel) raceRivalLabel.textContent = `${rivalName}🏃`;
    const setupRow = DOM.get("rival-setup-row");
    if (setupRow) setupRow.style.display = ["aman", "rishit"].includes(authenticatedUser) ? "none" : "flex";
    const rivalInput = DOM.get("rival-username-input");
    if (rivalInput && configuredRival && !rivalInput.value) rivalInput.value = configuredRival;

    const amanSteps = (amanAct.movement[selectedDate] || {}).steps || 0;
    const rishitSteps = (rishitAct.movement[selectedDate] || {}).steps || 0;

    const amanSleep = (amanAct.sleep[selectedDate] || {}).score || 0;
    const rishitSleep = (rishitAct.sleep[selectedDate] || {}).score || 0;

    const amanWater = fitnessData[amanUser].workouts[selectedDate].waterIntake || 0;
    const rishitWater = fitnessData[rishitUser].workouts[selectedDate].waterIntake || 0;

    // Workouts Pct
    const wAman = getWorkoutForDate(selectedDate);
    const amanCompEx = (fitnessData[amanUser].workouts[selectedDate].completedExercises || []).length;
    const amanTotalEx = wAman.exercises ? wAman.exercises.length : 0;
    const amanWorkoutPct = amanTotalEx > 0 ? Math.round((amanCompEx / amanTotalEx) * 100) : 0;

    const wRishit = getWorkoutForDate(selectedDate);
    const rishitCompEx = (fitnessData[rishitUser].workouts[selectedDate].completedExercises || []).length;
    const rishitTotalEx = wRishit.exercises ? wRishit.exercises.length : 0;
    const rishitWorkoutPct = rishitTotalEx > 0 ? Math.round((rishitCompEx / rishitTotalEx) * 100) : 0;

    // Display comparison text
    DOM.get("comp-steps-aman").textContent = amanSteps.toLocaleString() + " steps";
    DOM.get("comp-steps-rishit").textContent = rishitSteps.toLocaleString() + " steps";
    
    DOM.get("comp-sleep-aman").textContent = amanSleep > 0 ? amanSleep : "--";
    DOM.get("comp-sleep-rishit").textContent = rishitSleep > 0 ? rishitSleep : "--";

    DOM.get("comp-water-aman").textContent = amanWater + " ml";
    DOM.get("comp-water-rishit").textContent = rishitWater + " ml";

    DOM.get("comp-workout-aman").textContent = amanWorkoutPct + "%";
    DOM.get("comp-workout-rishit").textContent = rishitWorkoutPct + "%";

    // Set bar widths
    const setRatioBars = (idAman, idRishit, valAman, valRishit) => {
      const sum = valAman + valRishit;
      if (sum === 0) {
        DOM.get(idAman).style.width = "50%";
        DOM.get(idRishit).style.width = "50%";
      } else {
        DOM.get(idAman).style.width = Math.round((valAman / sum) * 100) + "%";
        DOM.get(idRishit).style.width = Math.round((valRishit / sum) * 100) + "%";
      }
    };

    setRatioBars("comp-bar-steps-aman", "comp-bar-steps-rishit", amanSteps, rishitSteps);
    setRatioBars("comp-bar-sleep-aman", "comp-bar-sleep-rishit", amanSleep, rishitSleep);
    setRatioBars("comp-bar-water-aman", "comp-bar-water-rishit", amanWater, rishitWater);
    setRatioBars("comp-bar-workout-aman", "comp-bar-workout-rishit", amanWorkoutPct, rishitWorkoutPct);

    // Compute H2H Leaderboard Score (XP based)
    const amanTotalXP = amanAct.xp ? amanAct.xp.total : 0;
    const rishitTotalXP = rishitAct.xp ? rishitAct.xp.total : 0;
    
    DOM.get("comp-aman-score").textContent = amanTotalXP.toLocaleString();
    DOM.get("comp-rishit-score").textContent = rishitTotalXP.toLocaleString();

    const leaderBadge = DOM.get("comp-leader-badge");
    if (amanTotalXP > rishitTotalXP) {
      leaderBadge.textContent = `${selfName} in Lead 👑`;
      leaderBadge.style.color = "#00ff88";
    } else if (rishitTotalXP > amanTotalXP) {
      leaderBadge.textContent = `${rivalName} in Lead 👑`;
      leaderBadge.style.color = "#9d4edd";
    } else {
      leaderBadge.textContent = "Draw";
      leaderBadge.style.color = "var(--text-sub)";
    }

    // Race Mode Progress
    DOM.get("race-steps-aman").textContent = `${amanSteps.toLocaleString()} / ${currentRaceTarget.toLocaleString()} steps`;
    DOM.get("race-steps-rishit").textContent = `${rishitSteps.toLocaleString()} / ${currentRaceTarget.toLocaleString()} steps`;

    const amanRacePct = Math.min(100, Math.round((amanSteps / currentRaceTarget) * 100));
    const rishitRacePct = Math.min(100, Math.round((rishitSteps / currentRaceTarget) * 100));

    DOM.get("race-bar-aman").style.width = amanRacePct + "%";
    DOM.get("race-bar-rishit").style.width = rishitRacePct + "%";

    const raceStatus = DOM.get("race-status-banner");
    const raceWinner = finalizeStepsRace(amanSteps, rishitSteps);
    if (amanSteps >= currentRaceTarget && rishitSteps >= currentRaceTarget) {
      if (raceWinner === "tie") {
        raceStatus.textContent = "🏁 Both crossed together—the race is tied!";
        raceStatus.style.color = "#ffb703";
      } else {
        const winnerName = raceWinner === "aman" ? selfName : rivalName;
        raceStatus.textContent = `🏁 Race finished! Winner: ${winnerName} (+200 XP)`;
        raceStatus.style.color = raceWinner === "aman" ? "#00ff88" : "#9d4edd";
      }
    } else if (amanSteps >= currentRaceTarget) {
      raceStatus.textContent = `🏁 ${selfName.toUpperCase()} WINS THE RACE! 🏆 (+200 XP)`;
      raceStatus.style.color = "#00ff88";
    } else if (rishitSteps >= currentRaceTarget) {
      raceStatus.textContent = `🏁 ${rivalName.toUpperCase()} WINS THE RACE! 🏆 (+200 XP)`;
      raceStatus.style.color = "#9d4edd";
    } else {
      const diff = Math.abs(amanSteps - rishitSteps);
      if (diff === 0) {
        raceStatus.textContent = "Race is tied! First to cross the finish line wins.";
      } else {
        const leader = amanSteps > rishitSteps ? selfName : rivalName;
        raceStatus.textContent = `${leader} is leading by ${diff.toLocaleString()} steps!`;
      }
    }
  }
  else if (activeActTab === "awards") {
    // Streaks and Badges
    DOM.get("streak-show-workout").textContent = `${streaks.workout} Days`;
    DOM.get("streak-show-steps").textContent = `${streaks.steps} Days`;
    DOM.get("streak-show-water").textContent = `${streaks.hydration} Days`;
    DOM.get("streak-show-sleep").textContent = `${streaks.sleep} Days`;

    // Render Badge grid
    const grid = DOM.get("act-badge-grid");
    grid.innerHTML = "";

    const availableBadges = [
      { id: "first-workout", name: "First Sweat", desc: "Log your first checked exercise", icon: "🏋️" },
      { id: "first-5k", name: "Active Start", desc: "Walk 5,000 steps in a single day", icon: "🚶" },
      { id: "first-10k", name: "Step Master", desc: "Walk 10,000 steps in a single day", icon: "👟" },
      { id: "consistent-crusader", name: "Consistent", desc: "Hit a 3-day workout streak", icon: "🔥" },
      { id: "gym-legend", name: "Gym Legend", desc: "Hit a 7-day workout streak", icon: "👑" },
      { id: "hydration-champ", name: "Hydration Hero", desc: "Drink 3.5L water 3 days in a row", icon: "💧" },
      { id: "sleep-master", name: "Sleep Master", desc: "Get 7h sleep 3 days in a row", icon: "🛌" },
      { id: "kitchen-master", name: "Kitchen King", desc: "Track calories for 3+ days", icon: "🍳" },
      { id: "iron-discipline", name: "Iron Discipline", desc: "Log a Friday workout card", icon: "🔩" },
      { id: "level-5", name: "Elite Level 5", desc: "Reach Level 5 in Fitness XP", icon: "⚡" },
      { id: "perfect-week", name: "Perfect Week", desc: "Complete 100% of 7 workouts", icon: "🛡️" }
    ];

    const unlockedBadges = fitnessData[currentUser].badges || [];
    availableBadges.forEach(b => {
      const isUnlocked = unlockedBadges.includes(b.id);
      const card = document.createElement("div");
      card.className = "glass-card badge-item";
      card.style.margin = "0";
      card.style.padding = "15px 10px";
      card.style.textAlign = "center";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.alignItems = "center";
      
      if (!isUnlocked) {
        card.style.filter = "grayscale(1)";
        card.style.opacity = "0.3";
      } else {
        card.style.boxShadow = `0 0 12px ${currentUser === "aman" ? "rgba(0,255,136,0.15)" : "rgba(157,78,221,0.15)"}`;
      }

      card.innerHTML = `
        <span style="font-size: 28px;">${b.icon}</span>
        <strong style="font-size: 12px; margin-top: 6px; color: var(--text-main); display: block;">${b.name}</strong>
        <span style="font-size: 9px; color: var(--text-sub); margin-top: 4px; display: block; line-height: 1.2;">${b.desc}</span>
        <span style="font-size: 8px; font-weight: 700; color: ${isUnlocked ? "var(--accent)" : "var(--text-sub)"}; text-transform: uppercase; margin-top: 6px;">
          ${isUnlocked ? "Unlocked" : "Locked"}
        </span>
      `;
      grid.appendChild(card);
    });
  }
  else if (activeActTab === "feed") {
    // Feed, Challenges, and AI insights
    const feedList = DOM.get("act-social-feed-list");
    feedList.innerHTML = "";
    
    // Combine each user's own cloud-backed feed, deduplicate, then sort newest-first.
    const feedUsers = [currentUser, getRivalUsername()].filter(Boolean);
    const combinedPosts = feedUsers.flatMap(user =>
      ((fitnessData[user] && fitnessData[user].activityData && fitnessData[user].activityData.feed) || [])
    );
    const postMap = new Map(combinedPosts.map(post => [post.id, post]));
    const posts = Array.from(postMap.values())
      .sort((a, b) => Date.parse(b.timestamp || 0) - Date.parse(a.timestamp || 0))
      .slice(0, 50);

    if (posts.length === 0) {
      feedList.innerHTML = `<div style="padding: 18px; text-align: center; color: var(--text-sub); font-size: 11px; border: 1px dashed var(--border-color); border-radius: 10px;">Real workouts, milestones, and posts will appear here.</div>`;
    }

    posts.forEach(p => {
      const item = document.createElement("div");
      item.style.background = "rgba(255,255,255,0.015)";
      item.style.border = "1px solid var(--border-color)";
      item.style.padding = "10px 12px";
      item.style.borderRadius = "10px";
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.gap = "8px";

      const timeAgo = Math.max(0, Math.round((Date.now() - new Date(p.timestamp)) / (1000 * 60)));
      const timeStr = timeAgo < 1 ? "just now" : timeAgo < 60 ? `${timeAgo}m ago` : timeAgo < 1440 ? `${Math.round(timeAgo/60)}h ago` : `${Math.round(timeAgo/1440)}d ago`;

      const avatarColor = p.username === currentUser ? "#00ff88" : "#9d4edd";
      item.innerHTML = `
        <div style="width: 24px; height: 24px; border-radius: 50%; background: ${avatarColor}; color: #000; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          ${p.username[0].toUpperCase()}
        </div>
        <div style="flex: 1; text-align: left;">
          <div style="font-size: 11.5px; color: var(--text-main); line-height: 1.3;">
            <strong>${escapeActivityText(p.username).toUpperCase()}:</strong> ${escapeActivityText(p.message)}
          </div>
          <span style="font-size: 8px; color: var(--text-sub); display: block; margin-top: 2px;">${timeStr}</span>
        </div>
      `;
      feedList.appendChild(item);
    });

    // Render challenges/quests
    const chList = DOM.get("act-challenges-list");
    chList.innerHTML = "";

    const dailyQuests = getDailyActivityQuests(currentUser, selectedDate);

    dailyQuests.forEach(q => {
      const qCard = document.createElement("div");
      qCard.style.background = "rgba(255,255,255,0.01)";
      qCard.style.border = "1px solid var(--border-color)";
      qCard.style.borderRadius = "8px";
      qCard.style.padding = "8px 10px";
      
      const pct = Math.min(100, Math.round((q.current / q.target) * 100));
      const claimed = Boolean(act.xpEvents[`quest:${selectedDate}:${q.id}`]);
      qCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; text-align: left;">
          <span style="font-weight: 600; color: var(--text-main);">${q.name}</span>
          <span style="color: var(--accent); font-weight: 700;">${claimed ? "✓ Earned" : `+${q.xp} XP`}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="flex: 1; height: 4px; background: rgba(255,255,255,0.04); border-radius: 2px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: var(--accent); transition: width 0.3s ease;"></div>
          </div>
          <span style="font-size: 9px; color: var(--text-sub); min-width: 35px; text-align: right;">${pct}%</span>
        </div>
      `;
      chList.appendChild(qCard);
    });

    // Render insights
    generateActivityInsights();
  }
  
  if (typeof safeCreateIcons !== 'undefined') safeCreateIcons();
}

function generateActivityInsights() {
  const container = DOM.get("act-insights-list");
  if (!container) return;
  container.innerHTML = "";

  const act = fitnessData[currentUser].activityData;
  const ins = [];

  const endDate = new Date(`${selectedDate}T12:00:00`);
  const dates = [];
  for (let offset = 6; offset >= 0; offset--) {
    const day = new Date(endDate);
    day.setDate(day.getDate() - offset);
    dates.push(dateToYYYYMMDD(day));
  }

  const movementDays = dates.map(date => act.movement[date]).filter(Boolean);
  if (movementDays.length) {
    const avgSteps = Math.round(movementDays.reduce((sum, item) => sum + (Number(item.steps) || 0), 0) / movementDays.length);
    ins.push(`Your 7-day average is <strong>${avgSteps.toLocaleString()} steps</strong> across ${movementDays.length} tracked day${movementDays.length === 1 ? "" : "s"}.`);
  } else {
    ins.push("Sync Health Connect or log a walk to begin movement insights.");
  }

  const waterDays = dates
    .map(date => fitnessData[currentUser].workouts[date])
    .filter(Boolean)
    .map(item => Number(item.waterIntake) || 0);
  if (waterDays.length) {
    const avgWater = Math.round(waterDays.reduce((sum, value) => sum + value, 0) / waterDays.length);
    ins.push(`Your 7-day hydration average is <strong>${avgWater.toLocaleString()} ml</strong> per logged day.`);
  } else {
    ins.push("Log water during the day to build a hydration trend.");
  }

  const sleepDays = dates.map(date => act.sleep[date]).filter(item => item && Number(item.duration) > 0);
  if (sleepDays.length) {
    const avgSleep = (sleepDays.reduce((sum, item) => sum + Number(item.duration), 0) / sleepDays.length).toFixed(1);
    ins.push(`Your 7-day sleep average is <strong>${avgSleep} hours</strong> across ${sleepDays.length} recorded night${sleepDays.length === 1 ? "" : "s"}.`);
  } else {
    ins.push("Sleep records from Health Connect will appear here after your first synced night.");
  }

  ins.slice(0, 3).forEach(text => {
    const card = document.createElement("div");
    card.style.background = "rgba(255,255,255,0.01)";
    card.style.border = "1px solid var(--border-color)";
    card.style.borderRadius = "8px";
    card.style.padding = "8px 10px";
    card.style.fontSize = "11.5px";
    card.style.color = "var(--text-sub)";
    card.style.textAlign = "left";
    card.style.lineHeight = "1.4";
    card.innerHTML = `🌟 ${text}`;
    container.appendChild(card);
  });
}

function renderActivityTrends() {
  const stepsChart = DOM.get("steps-bar-chart");
  const waterChart = DOM.get("water-bar-chart");
  const sleepChart = DOM.get("sleep-bar-chart");

  if (!stepsChart || !waterChart || !sleepChart) return;
  
  stepsChart.innerHTML = "";
  waterChart.innerHTML = "";
  sleepChart.innerHTML = "";

  const act = fitnessData[currentUser].activityData;
  const d = new Date(`${selectedDate}T12:00:00`);

  // Render 7 bars ending at selectedDate
  for (let i = 6; i >= 0; i--) {
    const tempD = new Date(d);
    tempD.setDate(tempD.getDate() - i);
    const ds = dateToYYYYMMDD(tempD);
    const dayLabel = getWeekdayName(ds).substr(0, 1);

    // 1. Steps chart
    const mRecord = act.movement[ds] || { steps: 0 };
    const stepPct = Math.min(100, Math.round((mRecord.steps / 10000) * 100));
    
    const sBar = document.createElement("div");
    sBar.className = "chart-bar-col";
    sBar.innerHTML = `
      <div style="flex: 1; display: flex; align-items: flex-end; width: 100%;">
        <div class="chart-bar-fill" style="height: ${stepPct}%; background: #00ff88;" title="${mRecord.steps.toLocaleString()} steps"></div>
      </div>
      <span style="font-size: 8px; color: var(--text-sub);">${dayLabel}</span>
    `;
    stepsChart.appendChild(sBar);

    // 2. Water chart
    const wRecord = fitnessData[currentUser].workouts[ds] || { waterIntake: 0 };
    const waterPct = Math.min(100, Math.round((wRecord.waterIntake / 3500) * 100));
    
    const watBar = document.createElement("div");
    watBar.className = "chart-bar-col";
    watBar.innerHTML = `
      <div style="flex: 1; display: flex; align-items: flex-end; width: 100%;">
        <div class="chart-bar-fill" style="height: ${waterPct}%; background: #00d9ff;" title="${wRecord.waterIntake} ml"></div>
      </div>
      <span style="font-size: 8px; color: var(--text-sub);">${dayLabel}</span>
    `;
    waterChart.appendChild(watBar);

    // 3. Sleep chart
    const sRecord = act.sleep[ds] || { duration: 0 };
    const sleepPct = Math.min(100, Math.round((sRecord.duration / 10) * 100));
    
    const slBar = document.createElement("div");
    slBar.className = "chart-bar-col";
    slBar.innerHTML = `
      <span style="font-size: 8px; color: var(--text-sub);">${dayLabel}</span>
    `;
    sleepChart.appendChild(slBar);
  }
}


/* ============================================================
   14. DUOGYM REAL-TIME CHAT SYSTEM
   ============================================================ */
let loadedMessages = [];
let chatPollingInterval = null;
let chatChannel = null;
let chatInitialLoadComplete = false;

function toggleChatWindow(forceState) {
  const container = DOM.get("chat-container");
  const backdrop = DOM.get("chat-backdrop");
  if (!container) return;
  
  const isCurrentlyVisible = container.classList.contains("active");
  const shouldShow = typeof forceState === "boolean" ? forceState : !isCurrentlyVisible;
  
  if (shouldShow) {
    container.style.display = "flex";
    container.classList.remove("slide-out");
    container.classList.add("active");
    
    if (backdrop) {
      backdrop.style.display = "block";
      // Force reflow
      backdrop.offsetHeight;
      backdrop.classList.add("active");
    }
    
    // Clear badge
    const badge = DOM.get("chat-badge");
    if (badge) badge.style.display = "none";
    
    // Set partner name
    const partnerName = currentUser === "aman" ? "Rishit" : "Aman";
    const partnerEl = DOM.get("chat-partner-name");
    if (partnerEl) partnerEl.textContent = "Chat with " + partnerName;
    
    // Clear native phone notifications when chat is opened
    if (typeof AndroidApp !== "undefined" && AndroidApp.clearChatNotifications) {
      try {
        AndroidApp.clearChatNotifications();
      } catch (_) {}
    }
    
    // Focus input on open
    setTimeout(() => {
      DOM.get("chat-message-input")?.focus();
      // Scroll to bottom immediately
      const listEl = DOM.get("chat-messages-list");
      if (listEl) listEl.scrollTop = listEl.scrollHeight;
    }, 100);
    
    // Trigger message load
    fetchChatMessages();
    
    // Increase polling frequency (every 4 seconds) when window is active
    startChatPolling(4000);
  } else {
    container.classList.add("slide-out");
    container.classList.remove("active");
    
    if (backdrop) {
      backdrop.classList.remove("active");
      setTimeout(() => {
        if (!container.classList.contains("active")) {
          backdrop.style.display = "none";
        }
      }, 300);
    }
    
    // Blur input to ensure keyboard dismisses immediately
    DOM.get("chat-message-input")?.blur();
    
    // Wait for animation to finish
    setTimeout(() => {
      if (container.classList.contains("slide-out")) {
        container.style.display = "none";
      }
    }, 300);
    
    // Slow down polling (every 15 seconds) when closed
    startChatPolling(15000); 
  }
}

async function fetchChatMessages() {
  if (document.hidden) return;
  if (!supabaseInitialized || !supabaseClient || !currentUser) return;
  
  try {
    const { data, error } = await supabaseClient
      .from('duogym_chat')
      .select('*')
      .or(`and(sender.eq.aman,receiver.eq.rishit),and(sender.eq.rishit,receiver.eq.aman)`)
      .order('created_at', { ascending: true })
      .limit(100);
      
    if (error) throw error;
    
    if (data) {
      // Find new messages that we didn't have before
      const existingIds = new Set(loadedMessages.map(m => m.id));
      const incomingMessages = data.filter(m => !existingIds.has(m.id));
      
      loadedMessages = data;
      renderChatMessages();
      
      // Update Android last checked timestamp to prevent notification spam
      if (data.length > 0) {
        const latestMsg = data[data.length - 1];
        if (typeof AndroidApp !== "undefined" && AndroidApp.updateLastReadTime) {
          try {
            AndroidApp.updateLastReadTime(latestMsg.created_at);
          } catch (_) {}
        }
      }
      
      // Only notify about genuinely new messages (skip initial load)
      if (chatInitialLoadComplete) {
        incomingMessages.forEach(msg => {
          if (msg.sender !== currentUser) {
            triggerIncomingMessageNotification(msg);
          }
        });
      }
      chatInitialLoadComplete = true;
    }
  } catch (e) {
    console.warn('Chat: Failed to fetch messages', e);
  }
}

function renderChatMessages() {
  const container = DOM.get("chat-messages-list");
  if (!container) return;
  
  container.innerHTML = "";
  
  if (loadedMessages.length === 0) {
    const placeholder = document.createElement("div");
    placeholder.style.display = "flex";
    placeholder.style.alignItems = "center";
    placeholder.style.justifyContent = "center";
    placeholder.style.height = "100%";
    placeholder.style.color = "var(--text-sub)";
    placeholder.style.fontSize = "12px";
    placeholder.style.textAlign = "center";
    placeholder.style.padding = "24px";
    placeholder.innerHTML = "No messages yet. Send a message to start competing!";
    container.appendChild(placeholder);
    return;
  }
  
  let lastDateStr = null;
  loadedMessages.forEach((msg, idx) => {
    // 1. Date header if date changed
    const msgDate = new Date(msg.created_at);
    const dateStr = msgDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    if (dateStr !== lastDateStr) {
      const dateHeader = document.createElement("div");
      dateHeader.className = "chat-date-header";
      dateHeader.textContent = dateStr;
      container.appendChild(dateHeader);
      lastDateStr = dateStr;
    }
    
    // 2. Determine consecutive groupings
    const prevMsg = loadedMessages[idx - 1];
    const nextMsg = loadedMessages[idx + 1];
    
    // Only group consecutive messages sent by the same user on the same calendar day
    const isConsecutivePrev = prevMsg && 
                             prevMsg.sender === msg.sender && 
                             (new Date(prevMsg.created_at).toLocaleDateString() === msgDate.toLocaleDateString());
                             
    const isConsecutiveNext = nextMsg && 
                             nextMsg.sender === msg.sender && 
                             (new Date(nextMsg.created_at).toLocaleDateString() === msgDate.toLocaleDateString());
    
    const row = document.createElement("div");
    row.className = `chat-msg-row ${msg.sender === currentUser ? 'self' : 'partner'}` +
                    (isConsecutivePrev ? ' consecutive-prev' : '') +
                    (isConsecutiveNext ? ' consecutive-next' : '');
    
    const bubble = document.createElement("div");
    bubble.className = `chat-msg-bubble sender-${msg.sender}`;
    
    let statusHTML = "";
    if (msg.status === 'sending') {
      statusHTML = `<span class="chat-msg-status sending">Sending...</span>`;
    } else if (msg.status === 'failed') {
      statusHTML = `<span class="chat-msg-status failed" onclick="retrySendChatMessage('${msg.id}'); event.stopPropagation();" title="Failed to save to database. Tap to retry.">⚠️ Failed to sync (Tap to retry)</span>`;
    }
    
    bubble.innerHTML = `
      <div class="chat-msg-text">${escapeHTML(msg.message)}</div>
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        ${statusHTML}
        <div class="chat-msg-time">${formatChatTime(msg.created_at)}</div>
      </div>
    `;
    
    row.appendChild(bubble);
    container.appendChild(row);
  });
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function handleSendChat(event) {
  if (event) event.preventDefault();
  const input = DOM.get("chat-message-input");
  if (!input) return;
  
  const text = input.value.trim();
  if (!text) return;
  
  input.value = "";
  sendChatMessage(text);
}

function sendQuickChatMessage(text) {
  sendChatMessage(text);
  // Focus the input to keep the experience seamless
  DOM.get("chat-message-input")?.focus();
}

async function sendChatMessage(messageText) {
  if (!currentUser) return;
  const sender = currentUser;
  const receiver = sender === 'aman' ? 'rishit' : 'aman';
  
  const tempId = 'temp-' + Date.now();
  const tempMsg = {
    id: tempId,
    sender,
    receiver,
    message: messageText,
    created_at: new Date().toISOString(),
    status: 'sending'
  };
  
  // Optimistic UI insert
  loadedMessages.push(tempMsg);
  renderChatMessages();
  
  performSendChatMessage(messageText, tempId);
}

async function performSendChatMessage(messageText, tempId) {
  const sender = currentUser;
  const receiver = sender === 'aman' ? 'rishit' : 'aman';
  try {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase client not initialized");
    
    const { data, error } = await client
      .from('duogym_chat')
      .insert({ sender, receiver, message: messageText })
      .select()
      .single();
      
    if (error) throw error;
    
    // Replace optimistic message with server message
    const index = loadedMessages.findIndex(m => m.id === tempId);
    if (index !== -1 && data) {
      loadedMessages[index] = data;
      renderChatMessages();
    }
  } catch (e) {
    console.warn('Chat: Failed to save message on Supabase', e);
    const index = loadedMessages.findIndex(m => m.id === tempId);
    if (index !== -1) {
      loadedMessages[index].status = 'failed';
      renderChatMessages();
    }
  }
}

function retrySendChatMessage(tempId) {
  const msg = loadedMessages.find(m => m.id === tempId);
  if (!msg) return;
  
  msg.status = 'sending';
  renderChatMessages();
  
  performSendChatMessage(msg.message, tempId);
}

function triggerIncomingMessageNotification(msg) {
  // Suppress notifications if user is already reading the chat window
  const container = DOM.get("chat-container");
  const isChatOpen = container && container.style.display !== "none" && container.classList.contains("active");
  if (isChatOpen) {
    return;
  }

  // Update header badge
  const badge = DOM.get("chat-badge");
  if (badge) badge.style.display = "block";
  
  // Always show popup notification for incoming partner messages
  showIncomingMessagePopup(msg);
  
  // Vibrate the device (works on Android WebView)
  try {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 150]); // short buzz pattern
    }
  } catch (_) {}
  
  // Trigger native Android system notification (shows in status bar & notification shade)
  try {
    if (typeof AndroidApp !== "undefined" && AndroidApp.showChatNotification) {
      const senderDisplay = msg.sender === 'aman' ? 'Aman' : 'Rishit';
      const replyAs = currentUser || '';
      const replyTo = currentUser === 'aman' ? 'rishit' : 'aman';
      AndroidApp.showChatNotification(senderDisplay, msg.message, replyAs, replyTo);
    }
  } catch (_) {}
}

function showIncomingMessagePopup(msg) {
  const existing = DOM.get("chat-popup-notification");
  if (existing) existing.remove();
  
  const popup = document.createElement("div");
  popup.id = "chat-popup-notification";
  popup.className = "chat-popup-banner";
  popup.innerHTML = `
    <div class="chat-popup-header">
      <span class="chat-popup-sender-dot sender-${msg.sender}"></span>
      <span class="chat-popup-title">${msg.sender === 'aman' ? 'Aman' : 'Rishit'}</span>
      <button class="chat-popup-close-btn" onclick="this.parentElement.parentElement.remove(); event.stopPropagation();">&times;</button>
    </div>
    <div class="chat-popup-body">
      ${escapeHTML(msg.message)}
    </div>
  `;
  
  popup.onclick = () => {
    toggleChatWindow(true);
    popup.remove();
  };
  
  document.body.appendChild(popup);
  
  // Play short soft notification pop using web audio API (completely client side, works offline!)
  playNotificationSound();
  
  // Auto-remove after 6 seconds
  setTimeout(() => {
    if (popup.parentElement) {
      popup.classList.add("fade-out");
      setTimeout(() => popup.remove(), 300);
    }
  }, 6000);
}

function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
    
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (_) {}
}

function startChatPolling(intervalMs) {
  stopChatPolling();
  
  chatPollingInterval = setInterval(() => {
    fetchChatMessages();
  }, intervalMs || 15000);
}

function stopChatPolling() {
  if (chatPollingInterval) {
    clearInterval(chatPollingInterval);
    chatPollingInterval = null;
  }
}

function initChatRealtime() {
  if (!supabaseInitialized || !supabaseClient) return;
  if (chatChannel) {
    supabaseClient.removeChannel(chatChannel);
  }
  
  chatChannel = supabaseClient
    .channel('public:duogym_chat')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'duogym_chat'
    }, payload => {
      const msg = payload.new;
      if (msg && (msg.sender === currentUser || msg.receiver === currentUser)) {
        const exists = loadedMessages.some(m => m.id === msg.id || (m.sender === msg.sender && m.message === msg.message && Math.abs(new Date(m.created_at) - new Date(msg.created_at)) < 3000));
        if (!exists) {
          loadedMessages.push(msg);
          renderChatMessages();
          
          // Update Android last checked timestamp to prevent notification spam
          if (typeof AndroidApp !== "undefined" && AndroidApp.updateLastReadTime) {
            try {
              AndroidApp.updateLastReadTime(msg.created_at);
            } catch (_) {}
          }
          
          if (msg.sender !== currentUser) {
            triggerIncomingMessageNotification(msg);
          }
        }
      }
    })
    .subscribe();
}

// Utility formatting helpers
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatChatTime(dateString) {
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return '';
  }
}


