/* ============================================================
   DuoGym Tracker — Core Application Script
   ============================================================
   This file manages the state, storage, and UI rendering for 
   Aman and Rishit's personal gym tracking website.
   ============================================================ */

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
        `switchUser('username')`.
     3. Add a CSS block for `body.user-username` to customize their accent colors.
   ============================================================ */

/* ============================================================
   2. EXERCISE DATABASE (exerciseLibrary)
   ============================================================ */
const exerciseLibrary = [];

/* ============================================================
   3. WEEKLY WORKOUT SCHEDULE (weeklySchedule)
   ============================================================ */
const weeklySchedule = [
  {
    day: "Monday",
    type: "Upper Body",
    focus: "Chest, Back & Arms",
    exercises: [
      { name: "Warm-Up: Treadmill Walk", sets: "", reps: "5 Minutes", exerciseId: "incline-treadmill" },
      { name: "Chest Press Machine",     sets: "3", reps: "12",        exerciseId: "chest-press" },
      { name: "Lat Pulldown",            sets: "3", reps: "12",        exerciseId: "lat-pulldown" },
      { name: "Seated Cable Row",        sets: "3", reps: "12",        exerciseId: "seated-cable-row" },
      { name: "Shoulder Press Machine",  sets: "3", reps: "12",        exerciseId: "shoulder-press" },
      { name: "Bicep Curl Machine",      sets: "2", reps: "12",        exerciseId: "bicep-curl" },
      { name: "Tricep Pushdown",         sets: "2", reps: "12",        exerciseId: "tricep-pushdown" },
      { name: "Stretching",             sets: "",  reps: "5 Minutes",  exerciseId: "full-body-stretching" }
    ]
  },
  {
    day: "Tuesday",
    type: "Cardio & Mobility",
    focus: "Heart Health & Flexibility",
    exercises: [
      { name: "Incline Treadmill Walk", sets: "",  reps: "20 Minutes", exerciseId: "incline-treadmill" },
      { name: "Cycling",                sets: "",  reps: "15 Minutes", exerciseId: "cycling" },
      { name: "Hamstring Stretch",      sets: "2", reps: "30 sec",     exerciseId: "hamstring-stretch" },
      { name: "Quad Stretch",           sets: "2", reps: "30 sec",     exerciseId: "quad-stretch" },
      { name: "Shoulder Stretch",       sets: "2", reps: "30 sec",     exerciseId: "shoulder-stretch" }
    ]
  },
  {
    day: "Wednesday",
    type: "Lower Body",
    focus: "Legs & Core",
    exercises: [
      { name: "Leg Press",           sets: "3", reps: "12",     exerciseId: "leg-press" },
      { name: "Leg Extension",       sets: "3", reps: "12",     exerciseId: "leg-extension" },
      { name: "Leg Curl",            sets: "3", reps: "12",     exerciseId: "leg-curl" },
      { name: "Standing Calf Raise",  sets: "3", reps: "15",     exerciseId: "calf-raise" },
      { name: "Glute Bridge",        sets: "3", reps: "12",     exerciseId: "glute-bridge" },
      { name: "Plank",               sets: "3", reps: "20 sec", exerciseId: "plank" },
      { name: "Dead Bug",            sets: "3", reps: "12",     exerciseId: "dead-bug" }
    ]
  },
  {
    day: "Thursday",
    type: "Active Recovery",
    focus: "Light Movement & Flexibility",
    exercises: [
      { name: "Brisk Walking",        sets: "",  reps: "20 Minutes", exerciseId: "brisk-walking" },
      { name: "Light Cycling",        sets: "",  reps: "10 Minutes", exerciseId: "cycling" },
      { name: "Full Body Stretching",  sets: "",  reps: "10 Minutes", exerciseId: "full-body-stretching" }
    ]
  },
  {
    day: "Friday",
    type: "Full Body",
    focus: "Complete Workout",
    exercises: [
      { name: "Chest Press Machine",    sets: "2", reps: "12", exerciseId: "chest-press" },
      { name: "Lat Pulldown",           sets: "2", reps: "12", exerciseId: "lat-pulldown" },
      { name: "Seated Cable Row",       sets: "2", reps: "12", exerciseId: "seated-cable-row" },
      { name: "Leg Press",              sets: "2", reps: "12", exerciseId: "leg-press" },
      { name: "Leg Curl",               sets: "2", reps: "12", exerciseId: "leg-curl" },
      { name: "Shoulder Press Machine", sets: "2", reps: "12", exerciseId: "shoulder-press" }
    ]
  },
  {
    day: "Saturday",
    type: "Cardio & Core",
    focus: "Heart & Abs",
    exercises: [
      { name: "Incline Walk", sets: "",  reps: "20 Minutes", exerciseId: "incline-treadmill" },
      { name: "Cycling",      sets: "",  reps: "10 Minutes", exerciseId: "cycling" },
      { name: "Plank",        sets: "3", reps: "25 sec",    exerciseId: "plank" },
      { name: "Crunches",     sets: "3", reps: "15",        exerciseId: "crunches" },
      { name: "Dead Bug",     sets: "3", reps: "12",        exerciseId: "dead-bug" }
    ]
  },
  {
    day: "Sunday",
    type: "Rest Day",
    focus: "Recovery & Light Activity",
    exercises: [
      { name: "No Gym — Optional casual walk", sets: "", reps: "20-30 Minutes", exerciseId: "brisk-walking" }
    ]
  }
];

/* ============================================================
   4. CONSTANTS & APPLICATION STATE
   ============================================================ */
const LOCAL_STORAGE_KEY = "duogym_fitness_data";
const START_DATE_STR = "2026-06-15"; // Monday
const END_DATE_STR = "2027-06-15";   // Tuesday

const STARTING_WEIGHTS = {
  aman: 94.6,
  rishit: 92.7
};

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
    document.getElementById("checkin-date-picker").value = selectedDate;
    updatePageContent();
  }
}

// Trigger date picker overlay click
function triggerDatePicker() {
  document.getElementById("checkin-date-picker").showPicker();
}

// Sets the selected date directly from date picker input
function setDateFromPicker(value) {
  if (isWithinSubscription(value)) {
    selectedDate = value;
    updatePageContent();
  } else {
    alert(`Please select a date within the subscription period: ${formatDateLong(START_DATE_STR)} to ${formatDateLong(END_DATE_STR)}`);
    document.getElementById("checkin-date-picker").value = selectedDate;
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
  document.getElementById("checkin-date-picker").value = selectedDate;
  updatePageContent();
}

/* ============================================================
   6. LOCAL STORAGE DATA MANAGEMENT
   ============================================================ */

// Returns default empty data structures for users
// Returns default empty data structures for users
function initData() {
  return {
    aman: {
      workouts: {},
      weights: { "2026-06-15": STARTING_WEIGHTS.aman },
      notes: { general: "" },
      measurements: {},
      photos: {},
      goalWeight: 80.0
    },
    rishit: {
      workouts: {},
      weights: { "2026-06-15": STARTING_WEIGHTS.rishit },
      notes: { general: "" },
      measurements: {},
      photos: {},
      goalWeight: 80.0
    },
    lastBackup: null
  };
}

// Load data from localStorage and perform migrations if necessary
function loadData() {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
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
  
  for (const user of ["aman", "rishit"]) {
    if (!fitnessData[user]) {
      fitnessData[user] = initData()[user];
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
      fitnessData[user].weights["2026-06-15"] = STARTING_WEIGHTS[user];
      migrated = true;
    }
  }
  
  if (migrated) {
    saveData();
  }
}

// Save data to localStorage
function saveData() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fitnessData));
}

// Returns the workout configuration for a given date based on weekday
function getWorkoutForDate(dateStr) {
  const weekday = getWeekdayName(dateStr);
  return weeklySchedule.find(w => w.day === weekday) || weeklySchedule[6]; // Default to Sunday Rest Day
}

function ensureDateRecord(user, dateStr) {
  if (!fitnessData[user]) {
    fitnessData[user] = { workouts: {}, weights: {}, notes: {}, measurements: {}, photos: {}, goalWeight: 80.0 };
  }
  if (!fitnessData[user].workouts) {
    fitnessData[user].workouts = {};
  }
  if (!fitnessData[user].workouts[dateStr]) {
    fitnessData[user].workouts[dateStr] = {
      completedExercises: [],
      completionPercentage: 0,
      notes: ""
    };
  }
}

/* ============================================================
   7. NAVIGATION & STATE CONTROLLERS
   ============================================================ */

// Switch the active user tab (Aman / Rishit)
function switchUser(user) {
  currentUser = user;
  
  // Update body css class for accent colors
  document.body.className = `user-${user}`;

  // Update tabs DOM classes
  document.getElementById("tab-user-aman").classList.toggle("active", user === "aman");
  document.getElementById("tab-user-rishit").classList.toggle("active", user === "rishit");

  // Re-render the active page elements
  updatePageContent();
}

// Switch between page panels (Summary, Today, Notes, Diet)
function switchPage(pageId) {
  activePage = pageId;

  // Toggle active styling on navigation buttons
  const navIds = ["summary", "today", "notes", "diet"];
  navIds.forEach(id => {
    const btn = document.getElementById(`nav-btn-${id}`);
    if (btn) btn.classList.toggle("active", id === pageId);
  });

  // Toggle active styling on section elements
  navIds.forEach(id => {
    const sec = document.getElementById(`page-${id}`);
    if (sec) sec.classList.toggle("active", id === pageId);
  });

  // Render content specific to the selected page
  updatePageContent();
}

// Route rendering depending on active page state
function updatePageContent() {
  if (activePage === "summary") {
    renderSummary();
  } else if (activePage === "today") {
    renderCheckIn();
  } else if (activePage === "notes") {
    renderNotes();
  } else if (activePage === "diet") {
    renderDietTracker();
  }
}

/* ============================================================
   8. PAGE RENDERERS
   ============================================================ */

/* ── RENDER PAGE 1: DAILY CHECK-IN ────────────────────────── */
function renderCheckIn() {
  ensureDateRecord(currentUser, selectedDate);
  const record = fitnessData[currentUser].workouts[selectedDate];
  const workout = getWorkoutForDate(selectedDate);

  // Set date text in navigator
  document.getElementById("checkin-date-text").textContent = formatDateLong(selectedDate);
  document.getElementById("checkin-date-picker").value = selectedDate;

  // Set workout header details
  document.getElementById("workout-day-badge").textContent = `${getWeekdayName(selectedDate)} Workout`;
  document.getElementById("workout-name-text").textContent = workout.type;
  document.getElementById("workout-focus-text").textContent = workout.focus;

  // Populate workout notes
  document.getElementById("today-notes-input").value = record.notes || "";

  // Missed yesterday's workout check (subtle notification)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = dateToYYYYMMDD(yesterday);
  const banner = document.getElementById("yesterday-missed-banner");
  
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

  // Render checklist items
  const checklistContainer = document.getElementById("checklist-container");
  checklistContainer.innerHTML = "";

  // If selectedDate is in the future, checklist rows should look disabled/read-only
  const isFutureDate = selectedDate > dateToYYYYMMDD(new Date());

  workout.exercises.forEach(ex => {
    const isChecked = record.completedExercises.includes(ex.exerciseId);

    // Create row div
    const row = document.createElement("div");
    row.className = `checklist-row ${isChecked ? "checked" : ""}`;
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
    input.disabled = isFutureDate;
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

    const detailSpan = document.createElement("span");
    detailSpan.className = "ex-details";
    detailSpan.textContent = ex.sets ? `${ex.sets} Sets × ${ex.reps}` : ex.reps;

    label.appendChild(nameSpan);
    label.appendChild(detailSpan);

    left.appendChild(chkWrapper);
    left.appendChild(label);

    row.appendChild(left);

    checklistContainer.appendChild(row);
  });

  // Disable notes input for future dates
  const notesInput = document.getElementById("today-notes-input");
  if (notesInput) {
    if (isFutureDate) {
      notesInput.disabled = true;
      notesInput.placeholder = "Notes are disabled for future dates.";
    } else {
      notesInput.disabled = false;
      notesInput.placeholder = "Enter notes for this date (e.g. increase weights, injury, energy levels...)";
    }
  }

  lucide.createIcons();
  updateProgressBar();
}

// Toggles checked state for an exercise in Today's checklist
function toggleExerciseCheck(exerciseId) {
  if (selectedDate > dateToYYYYMMDD(new Date())) {
    alert("Cannot log workouts for future dates.");
    return;
  }
  ensureDateRecord(currentUser, selectedDate);
  const record = fitnessData[currentUser].workouts[selectedDate];
  const index = record.completedExercises.indexOf(exerciseId);

  if (index === -1) {
    record.completedExercises.push(exerciseId);
  } else {
    record.completedExercises.splice(index, 1);
  }

  // Recalculate percentage
  const workout = getWorkoutForDate(selectedDate);
  const total = workout.exercises.length;
  const completed = record.completedExercises.length;
  record.completionPercentage = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;

  saveData();
  renderCheckIn();
}

// Updates progress bar visual states dynamically
function updateProgressBar() {
  const record = fitnessData[currentUser].workouts[selectedDate];
  const workout = getWorkoutForDate(selectedDate);
  const total = workout.exercises.length;
  const completed = record ? record.completedExercises.length : 0;
  const percent = record ? record.completionPercentage : 0;

  document.getElementById("workout-progress-percent").textContent = `${percent}%`;
  document.getElementById("workout-progress-fill").style.width = `${percent}%`;
  document.getElementById("workout-count-text").textContent = `Completed: ${completed} of ${total} exercises`;
}

// Saves text entered in today's notes input instantly (autosave)
function saveTodayNotes() {
  if (selectedDate > dateToYYYYMMDD(new Date())) return;
  ensureDateRecord(currentUser, selectedDate);
  fitnessData[currentUser].workouts[selectedDate].notes = document.getElementById("today-notes-input").value;
  saveData();
}


/* ── RENDER PAGE 5: GENERAL NOTES ─────────────────────────── */
function renderNotes() {
  const notes = (fitnessData[currentUser].notes && fitnessData[currentUser].notes.general) || "";
  document.getElementById("general-notes-input").value = notes;

  // Render last backup status info
  const backupText = document.getElementById("last-backup-text");
  const backupIcon = document.getElementById("backup-status-icon");
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
    lucide.createIcons();
  }
}

// Saves text entered in the general notes textarea automatically (autosave)
function saveGeneralNotes() {
  if (!fitnessData[currentUser].notes) {
    fitnessData[currentUser].notes = {};
  }
  fitnessData[currentUser].notes.general = document.getElementById("general-notes-input").value;
  saveData();
}

/* ============================================================
   10. GOOGLE DRIVE BACKUP & RESTORE UTILITIES
   ============================================================ */

// Trigger file download containing fitnessData JSON string
function downloadBackup() {
  fitnessData.lastBackup = dateToYYYYMMDD(new Date());
  saveData();
  renderNotes(); // Refresh label immediately

  // Wrap fitnessData and diet data together
  const exportData = JSON.parse(JSON.stringify(fitnessData));
  exportData._amanDietData = amanDietData;
  exportData._rishitDietData = rishitDietData;

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  
  // Generate filename: GymTracker_Backup_YYYY-MM-DD.json
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const filename = `GymTracker_Backup_${yyyy}-${mm}-${dd}.json`;

  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Click hidden file input
function triggerRestoreUpload() {
  document.getElementById("backup-file-upload").click();
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
            localStorage.setItem("amanDietData", JSON.stringify(amanDietData));
          }
          if (parsed._rishitDietData) {
            rishitDietData = parsed._rishitDietData;
            localStorage.setItem("rishitDietData", JSON.stringify(rishitDietData));
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
  const installBtn = document.getElementById("install-app-btn");
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
    const installBtn = document.getElementById("install-app-btn");
    if (installBtn) {
      installBtn.style.display = "none";
    }
  });
}

window.addEventListener("appinstalled", (evt) => {
  console.log("App was successfully installed");
  const installBtn = document.getElementById("install-app-btn");
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
  const startWeight = STARTING_WEIGHTS[user];
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

// Render Summary Dashboard page values
function renderSummary() {
  const streakData = calculateStreaks(currentUser);
  const stats = calculateWorkoutStats(currentUser);
  
  // Update Streak UI
  document.getElementById("summary-current-streak").textContent = `${streakData.currentStreak} Days`;
  document.getElementById("summary-best-streak").textContent = `${streakData.bestStreak} Days`;
  
  const currentStreakTrend = document.getElementById("summary-current-streak-trend");
  if (streakData.currentStreak > 0) {
    currentStreakTrend.textContent = "Streak is active! 🔥";
  } else {
    currentStreakTrend.textContent = "Keep it up! 🔥";
  }

  // Update Completion UI
  document.getElementById("summary-completion-percent").textContent = `${stats.percent}%`;
  document.getElementById("summary-completion-ratio").textContent = `Completed: ${stats.completed} of ${stats.completed + stats.missed}`;

  // Update Workouts Logged UI
  document.getElementById("summary-total-completed").textContent = `${stats.completed}`;
  document.getElementById("summary-total-missed").textContent = `Missed: ${stats.missed} | Rest: ${stats.restDays}`;

  lucide.createIcons();
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
  renderWeightTracker();
  if (activePage === "summary") renderSummary();
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

// Food database containing Indian, Bengali, and common daily foods
const dietFoods = [
  {n:"Poha",c:"Breakfast",s:"1 plate (150g)",k:180},
  {n:"Chire Bhaja",c:"Breakfast",s:"1 cup (80g)",k:290},
  {n:"Doodh Chire",c:"Breakfast",s:"1 bowl (200g)",k:220},
  {n:"Muri",c:"Breakfast",s:"1 cup (30g)",k:110},
  {n:"Muri Makha",c:"Breakfast",s:"1 plate (120g)",k:200},
  {n:"Jhal Muri",c:"Breakfast",s:"1 plate (100g)",k:130},
  {n:"Suji Upma",c:"Breakfast",s:"1 plate (150g)",k:200},
  {n:"Vegetable Upma",c:"Breakfast",s:"1 plate (150g)",k:180},
  {n:"Daliya",c:"Breakfast",s:"1 bowl (200g)",k:150},
  {n:"Oats Porridge",c:"Breakfast",s:"1 bowl (200g)",k:150},
  {n:"Cornflakes",c:"Breakfast",s:"1 bowl (40g+200ml milk)",k:200},
  {n:"Bread Butter",c:"Breakfast",s:"2 slices+butter",k:220},
  {n:"Bread Jam",c:"Breakfast",s:"2 slices+jam",k:210},
  {n:"Bread Toast",c:"Breakfast",s:"2 slices",k:160},
  {n:"Vegetable Sandwich",c:"Breakfast",s:"1 sandwich",k:200},
  {n:"Aloo Paratha",c:"Breakfast",s:"1 paratha (100g)",k:260},
  {n:"Paneer Paratha",c:"Breakfast",s:"1 paratha (100g)",k:280},
  {n:"Plain Paratha",c:"Breakfast",s:"1 paratha (80g)",k:220},
  {n:"Lachha Paratha",c:"Breakfast",s:"1 paratha (80g)",k:240},
  {n:"Luchi",c:"Breakfast",s:"2 pieces (80g)",k:210},
  {n:"Kochuri",c:"Breakfast",s:"2 pieces (80g)",k:240},
  {n:"Radhaballabhi",c:"Breakfast",s:"2 pieces (80g)",k:260},
  {n:"Ghugni",c:"Breakfast",s:"1 bowl (150g)",k:160},
  {n:"Cholar Dal",c:"Breakfast",s:"1 bowl (150g)",k:180},
  {n:"Idli",c:"Breakfast",s:"2 pieces (100g)",k:130},
  {n:"Dosa",c:"Breakfast",s:"1 plain (80g)",k:170},
  {n:"Uttapam",c:"Breakfast",s:"1 piece (100g)",k:180},
  {n:"Pongal",c:"Breakfast",s:"1 bowl (200g)",k:200},
  {n:"Puri Bhaji",c:"Breakfast",s:"2 puri+bhaji",k:310},
  {n:"Sabudana Khichdi",c:"Breakfast",s:"1 plate (150g)",k:230},
  {n:"Besan Chilla",c:"Breakfast",s:"2 pieces (100g)",k:180},
  {n:"Moong Dal Chilla",c:"Breakfast",s:"2 pieces (100g)",k:160},
  {n:"Thepla",c:"Breakfast",s:"2 pieces (80g)",k:200},
  {n:"Handvo",c:"Breakfast",s:"1 slice (100g)",k:160},
  {n:"Dhokla",c:"Breakfast",s:"4 pieces (100g)",k:150},
  {n:"Banana",c:"Fruits",s:"1 medium (120g)",k:105},
  {n:"Apple",c:"Fruits",s:"1 medium (182g)",k:95},
  {n:"Papaya",c:"Fruits",s:"1 cup (145g)",k:62},
  {n:"Guava",c:"Fruits",s:"1 medium (100g)",k:68},
  {n:"Seasonal Fruit Bowl",c:"Fruits",s:"1 bowl (200g)",k:120},
  {n:"Steamed Rice",c:"Rice",s:"1 cup cooked (180g)",k:240},
  {n:"Gobindobhog Rice",c:"Rice",s:"1 cup cooked (180g)",k:250},
  {n:"Brown Rice",c:"Rice",s:"1 cup cooked (195g)",k:215},
  {n:"Jeera Rice",c:"Rice",s:"1 cup (180g)",k:260},
  {n:"Ghee Rice",c:"Rice",s:"1 cup (180g)",k:290},
  {n:"Lemon Rice",c:"Rice",s:"1 plate (180g)",k:260},
  {n:"Curd Rice",c:"Rice",s:"1 plate (200g)",k:220},
  {n:"Vegetable Pulao",c:"Rice",s:"1 plate (200g)",k:270},
  {n:"Peas Pulao",c:"Rice",s:"1 plate (200g)",k:260},
  {n:"Veg Biryani",c:"Rice",s:"1 plate (300g)",k:420},
  {n:"Khichdi",c:"Rice",s:"1 bowl (250g)",k:280},
  {n:"Bhoger Khichuri",c:"Rice",s:"1 plate (250g)",k:320},
  {n:"Masala Khichdi",c:"Rice",s:"1 plate (250g)",k:300},
  {n:"Moong Dal Khichdi",c:"Rice",s:"1 bowl (250g)",k:270},
  {n:"Vegetable Khichdi",c:"Rice",s:"1 bowl (250g)",k:260},
  {n:"Roti",c:"Bread",s:"1 roti (40g)",k:100},
  {n:"Chapati",c:"Bread",s:"1 chapati (40g)",k:100},
  {n:"Phulka",c:"Bread",s:"1 phulka (35g)",k:85},
  {n:"Tandoori Roti",c:"Bread",s:"1 piece (60g)",k:130},
  {n:"Missi Roti",c:"Bread",s:"1 piece (60g)",k:145},
  {n:"Bajra Roti",c:"Bread",s:"1 piece (50g)",k:120},
  {n:"Jowar Roti",c:"Bread",s:"1 piece (50g)",k:110},
  {n:"Makki Roti",c:"Bread",s:"1 piece (60g)",k:135},
  {n:"Naan",c:"Bread",s:"1 piece (90g)",k:260},
  {n:"Kulcha",c:"Bread",s:"1 piece (90g)",k:250},
  {n:"Stuffed Kulcha",c:"Bread",s:"1 piece (110g)",k:280},
  {n:"Roomali Roti",c:"Bread",s:"1 piece (50g)",k:115},
  {n:"Moong Dal",c:"Dal",s:"1 bowl (200g)",k:150},
  {n:"Masoor Dal",c:"Dal",s:"1 bowl (200g)",k:160},
  {n:"Toor Dal",c:"Dal",s:"1 bowl (200g)",k:170},
  {n:"Arhar Dal",c:"Dal",s:"1 bowl (200g)",k:175},
  {n:"Chana Dal",c:"Dal",s:"1 bowl (200g)",k:180},
  {n:"Urad Dal",c:"Dal",s:"1 bowl (200g)",k:185},
  {n:"Dal Tadka",c:"Dal",s:"1 bowl (200g)",k:190},
  {n:"Dal Fry",c:"Dal",s:"1 bowl (200g)",k:200},
  {n:"Mixed Dal",c:"Dal",s:"1 bowl (200g)",k:170},
  {n:"Panchmel Dal",c:"Dal",s:"1 bowl (200g)",k:180},
  {n:"Bengali Dal",c:"Dal",s:"1 bowl (200g)",k:155},
  {n:"Tomato Dal",c:"Dal",s:"1 bowl (200g)",k:160},
  {n:"Palak Dal",c:"Dal",s:"1 bowl (200g)",k:155},
  {n:"Lau Dal",c:"Dal",s:"1 bowl (200g)",k:140},
  {n:"Sambar",c:"Dal",s:"1 bowl (200g)",k:120},
  {n:"Aloo Bhaja",c:"Bengali Sabji",s:"1 serving (80g)",k:160},
  {n:"Begun Bhaja",c:"Bengali Sabji",s:"1 serving (80g)",k:130},
  {n:"Potol Bhaja",c:"Bengali Sabji",s:"1 serving (80g)",k:110},
  {n:"Kumro Bhaja",c:"Bengali Sabji",s:"1 serving (80g)",k:105},
  {n:"Jhinge Bhaja",c:"Bengali Sabji",s:"1 serving (80g)",k:100},
  {n:"Ucche Bhaja",c:"Bengali Sabji",s:"1 serving (80g)",k:90},
  {n:"Aloo Posto",c:"Bengali Sabji",s:"1 serving (120g)",k:185},
  {n:"Potol Posto",c:"Bengali Sabji",s:"1 serving (120g)",k:160},
  {n:"Jhinge Posto",c:"Bengali Sabji",s:"1 serving (120g)",k:150},
  {n:"Chorchori",c:"Bengali Sabji",s:"1 serving (150g)",k:170},
  {n:"Labra",c:"Bengali Sabji",s:"1 serving (150g)",k:155},
  {n:"Shukto",c:"Bengali Sabji",s:"1 bowl (150g)",k:140},
  {n:"Ghonto",c:"Bengali Sabji",s:"1 serving (150g)",k:150},
  {n:"Mochar Ghonto",c:"Bengali Sabji",s:"1 serving (150g)",k:165},
  {n:"Bandhakopir Ghonto",c:"Bengali Sabji",s:"1 serving (150g)",k:120},
  {n:"Lau Ghonto",c:"Bengali Sabji",s:"1 serving (150g)",k:100},
  {n:"Kumro Ghonto",c:"Bengali Sabji",s:"1 serving (150g)",k:115},
  {n:"Palong Ghonto",c:"Bengali Sabji",s:"1 serving (150g)",k:110},
  {n:"Thor Ghonto",c:"Bengali Sabji",s:"1 serving (150g)",k:130},
  {n:"Chhanar Dalna",c:"Bengali Sabji",s:"1 bowl (200g)",k:230},
  {n:"Dhokar Dalna",c:"Bengali Sabji",s:"1 bowl (200g)",k:240},
  {n:"Niramish Dalna",c:"Bengali Sabji",s:"1 bowl (200g)",k:160},
  {n:"Alur Dom",c:"Bengali Sabji",s:"1 bowl (200g)",k:220},
  {n:"Niramish Alur Dum",c:"Bengali Sabji",s:"1 bowl (200g)",k:190},
  {n:"Bandhakopi Tarkari",c:"Bengali Sabji",s:"1 serving (150g)",k:110},
  {n:"Lau Tarkari",c:"Bengali Sabji",s:"1 serving (150g)",k:90},
  {n:"Jhinge Tarkari",c:"Bengali Sabji",s:"1 serving (150g)",k:100},
  {n:"Potol Tarkari",c:"Bengali Sabji",s:"1 serving (150g)",k:110},
  {n:"Kumro Tarkari",c:"Bengali Sabji",s:"1 serving (150g)",k:105},
  {n:"Palak Sabji",c:"Bengali Sabji",s:"1 serving (150g)",k:100},
  {n:"Methi Sabji",c:"Bengali Sabji",s:"1 serving (150g)",k:90},
  {n:"Mixed Vegetable Curry",c:"Bengali Sabji",s:"1 bowl (200g)",k:150},
  {n:"Vegetable Jalfrezi",c:"Bengali Sabji",s:"1 bowl (200g)",k:160},
  {n:"Paneer Butter Masala",c:"Paneer",s:"1 bowl (200g)",k:330},
  {n:"Kadai Paneer",c:"Paneer",s:"1 bowl (200g)",k:310},
  {n:"Shahi Paneer",c:"Paneer",s:"1 bowl (200g)",k:350},
  {n:"Palak Paneer",c:"Paneer",s:"1 bowl (200g)",k:270},
  {n:"Matar Paneer",c:"Paneer",s:"1 bowl (200g)",k:280},
  {n:"Paneer Bhurji",c:"Paneer",s:"1 serving (150g)",k:270},
  {n:"Paneer Do Pyaza",c:"Paneer",s:"1 bowl (200g)",k:300},
  {n:"Paneer Tikka Masala",c:"Paneer",s:"1 bowl (200g)",k:340},
  {n:"Paneer Lababdar",c:"Paneer",s:"1 bowl (200g)",k:360},
  {n:"Paneer Korma",c:"Paneer",s:"1 bowl (200g)",k:370},
  {n:"Paneer Curry",c:"Paneer",s:"1 bowl (200g)",k:290},
  {n:"Soybean Curry",c:"Soybean",s:"1 bowl (200g)",k:210},
  {n:"Soybean Masala",c:"Soybean",s:"1 bowl (200g)",k:220},
  {n:"Soybean Bhurji",c:"Soybean",s:"1 serving (150g)",k:190},
  {n:"Soybean Keema",c:"Soybean",s:"1 bowl (200g)",k:230},
  {n:"Soybean Pulao",c:"Soybean",s:"1 plate (200g)",k:270},
  {n:"Aloo Gobi",c:"Dry Veg",s:"1 serving (150g)",k:150},
  {n:"Aloo Matar",c:"Dry Veg",s:"1 serving (150g)",k:160},
  {n:"Aloo Beans",c:"Dry Veg",s:"1 serving (150g)",k:145},
  {n:"Aloo Capsicum",c:"Dry Veg",s:"1 serving (150g)",k:140},
  {n:"Aloo Palak",c:"Dry Veg",s:"1 serving (150g)",k:135},
  {n:"Bhindi Masala",c:"Dry Veg",s:"1 serving (150g)",k:130},
  {n:"Bhindi Fry",c:"Dry Veg",s:"1 serving (150g)",k:140},
  {n:"Baingan Bharta",c:"Dry Veg",s:"1 bowl (150g)",k:120},
  {n:"Baingan Curry",c:"Dry Veg",s:"1 bowl (150g)",k:130},
  {n:"Lauki Sabji",c:"Dry Veg",s:"1 serving (150g)",k:90},
  {n:"Tinda Sabji",c:"Dry Veg",s:"1 serving (150g)",k:95},
  {n:"Parwal Sabji",c:"Dry Veg",s:"1 serving (150g)",k:105},
  {n:"Cabbage Sabji",c:"Dry Veg",s:"1 serving (150g)",k:100},
  {n:"Carrot Beans Sabji",c:"Dry Veg",s:"1 serving (150g)",k:110},
  {n:"Beetroot Sabji",c:"Dry Veg",s:"1 serving (150g)",k:90},
  {n:"Mixed Veg Sabji",c:"Dry Veg",s:"1 serving (150g)",k:120},
  {n:"Rajma",c:"Legumes",s:"1 bowl (200g)",k:230},
  {n:"Rajma Masala",c:"Legumes",s:"1 bowl (200g)",k:240},
  {n:"Chole",c:"Legumes",s:"1 bowl (200g)",k:250},
  {n:"Chana Masala",c:"Legumes",s:"1 bowl (200g)",k:260},
  {n:"Kala Chana Curry",c:"Legumes",s:"1 bowl (200g)",k:240},
  {n:"White Peas Curry",c:"Legumes",s:"1 bowl (200g)",k:230},
  {n:"Sprouts Curry",c:"Legumes",s:"1 bowl (200g)",k:150},
  {n:"Chanachur",c:"Snacks",s:"1 handful (30g)",k:140},
  {n:"Roasted Chana",c:"Snacks",s:"1 handful (40g)",k:150},
  {n:"Roasted Peanut",c:"Snacks",s:"1 handful (30g)",k:170},
  {n:"Peanut Chaat",c:"Snacks",s:"1 plate (100g)",k:220},
  {n:"Sprouts Chaat",c:"Snacks",s:"1 plate (100g)",k:100},
  {n:"Fruit Chaat",c:"Snacks",s:"1 plate (150g)",k:120},
  {n:"Makhana",c:"Snacks",s:"1 cup (30g)",k:110},
  {n:"Bhel Puri",c:"Snacks",s:"1 plate (150g)",k:170},
  {n:"Sev Puri",c:"Snacks",s:"1 plate (150g)",k:200},
  {n:"Dahi Puri",c:"Snacks",s:"1 plate (100g)",k:180},
  {n:"Papdi Chaat",c:"Snacks",s:"1 plate (150g)",k:250},
  {n:"Samosa",c:"Snacks",s:"1 piece (80g)",k:190},
  {n:"Kachori",c:"Snacks",s:"1 piece (70g)",k:210},
  {n:"Singara",c:"Snacks",s:"1 piece (80g)",k:185},
  {n:"Vegetable Cutlet",c:"Snacks",s:"1 piece (80g)",k:150},
  {n:"Veg Chop",c:"Snacks",s:"1 piece (80g)",k:160},
  {n:"Beguni",c:"Snacks",s:"2 pieces (60g)",k:140},
  {n:"Peyaji",c:"Snacks",s:"2 pieces (60g)",k:130},
  {n:"Mochar Chop",c:"Snacks",s:"1 piece (80g)",k:170},
  {n:"Aloor Chop",c:"Snacks",s:"1 piece (80g)",k:180},
  {n:"Puchka",c:"Street Food",s:"6 pieces",k:130},
  {n:"Dahi Puchka",c:"Street Food",s:"6 pieces",k:160},
  {n:"Churmur",c:"Street Food",s:"1 plate (150g)",k:200},
  {n:"Vegetable Roll",c:"Street Food",s:"1 roll (150g)",k:250},
  {n:"Paneer Roll",c:"Street Food",s:"1 roll (150g)",k:300},
  {n:"Chowmein",c:"Street Food",s:"1 plate (200g)",k:280},
  {n:"Veg Momos",c:"Street Food",s:"6 pieces",k:200},
  {n:"Tomato Soup",c:"Soups",s:"1 bowl (250ml)",k:80},
  {n:"Vegetable Soup",c:"Soups",s:"1 bowl (250ml)",k:70},
  {n:"Sweet Corn Soup",c:"Soups",s:"1 bowl (250ml)",k:100},
  {n:"Spinach Soup",c:"Soups",s:"1 bowl (250ml)",k:60},
  {n:"Lentil Soup",c:"Soups",s:"1 bowl (250ml)",k:130},
  {n:"Pumpkin Soup",c:"Soups",s:"1 bowl (250ml)",k:75},
  {n:"Mixed Veg Soup",c:"Soups",s:"1 bowl (250ml)",k:80},
  {n:"Kachumber Salad",c:"Salads",s:"1 bowl (150g)",k:45},
  {n:"Cucumber Salad",c:"Salads",s:"1 bowl (150g)",k:30},
  {n:"Onion Salad",c:"Salads",s:"1 bowl (100g)",k:40},
  {n:"Tomato Salad",c:"Salads",s:"1 bowl (150g)",k:35},
  {n:"Sprouts Salad",c:"Salads",s:"1 bowl (150g)",k:80},
  {n:"Fruit Salad",c:"Salads",s:"1 bowl (200g)",k:120},
  {n:"Mixed Vegetable Salad",c:"Salads",s:"1 bowl (200g)",k:60},
  {n:"Rasgulla",c:"Bengali Sweets",s:"2 pieces (100g)",k:186},
  {n:"Rajbhog",c:"Bengali Sweets",s:"2 pieces (100g)",k:200},
  {n:"Sandesh",c:"Bengali Sweets",s:"2 pieces (60g)",k:170},
  {n:"Mishti Doi",c:"Bengali Sweets",s:"1 cup (150g)",k:180},
  {n:"Chhanar Payesh",c:"Bengali Sweets",s:"1 bowl (150g)",k:220},
  {n:"Payesh",c:"Bengali Sweets",s:"1 bowl (150g)",k:210},
  {n:"Roshomalai",c:"Bengali Sweets",s:"2 pieces (100g)",k:200},
  {n:"Kalakand",c:"Bengali Sweets",s:"1 piece (60g)",k:180},
  {n:"Cham Cham",c:"Bengali Sweets",s:"2 pieces (100g)",k:190},
  {n:"Pantua",c:"Bengali Sweets",s:"2 pieces (100g)",k:220},
  {n:"Ledikeni",c:"Bengali Sweets",s:"2 pieces (100g)",k:210},
  {n:"Kheer Kadam",c:"Bengali Sweets",s:"2 pieces (100g)",k:230},
  {n:"Gulab Jamun",c:"Desserts",s:"2 pieces (100g)",k:280},
  {n:"Jalebi",c:"Desserts",s:"2 pieces (60g)",k:200},
  {n:"Rabri",c:"Desserts",s:"1 bowl (100g)",k:230},
  {n:"Kheer",c:"Desserts",s:"1 bowl (150g)",k:200},
  {n:"Seviyan Kheer",c:"Desserts",s:"1 bowl (150g)",k:210},
  {n:"Gajar Halwa",c:"Desserts",s:"1 serving (150g)",k:280},
  {n:"Suji Halwa",c:"Desserts",s:"1 serving (150g)",k:300},
  {n:"Moong Dal Halwa",c:"Desserts",s:"1 serving (150g)",k:340},
  {n:"Besan Ladoo",c:"Desserts",s:"2 pieces (60g)",k:280},
  {n:"Motichoor Ladoo",c:"Desserts",s:"2 pieces (60g)",k:260},
  {n:"Rasmalai",c:"Desserts",s:"2 pieces (100g)",k:210},
  {n:"Mango",c:"Fruits",s:"1 cup (165g)",k:99},
  {n:"Orange",c:"Fruits",s:"1 medium (130g)",k:62},
  {n:"Mosambi",c:"Fruits",s:"1 medium (130g)",k:58},
  {n:"Pineapple",c:"Fruits",s:"1 cup (165g)",k:83},
  {n:"Watermelon",c:"Fruits",s:"1 cup (280g)",k:84},
  {n:"Muskmelon",c:"Fruits",s:"1 cup (177g)",k:60},
  {n:"Pomegranate",c:"Fruits",s:"1/2 cup seeds (87g)",k:72},
  {n:"Grapes",c:"Fruits",s:"1 cup (151g)",k:104},
  {n:"Litchi",c:"Fruits",s:"1 cup (190g)",k:125},
  {n:"Jackfruit",c:"Fruits",s:"1 cup (165g)",k:155},
  {n:"Coconut",c:"Fruits",s:"1/4 cup (20g)",k:71},
  {n:"Pear",c:"Fruits",s:"1 medium (166g)",k:96},
  {n:"Plum",c:"Fruits",s:"2 medium (132g)",k:60},
  {n:"Dahi Puchka (Street)",c:"Street Food",s:"6 pieces",k:160},
  {n:"Milk",c:"Breakfast",s:"1 glass (200ml)",k:120}
];

// Default preset diet plan mapping (Fat-loss base plan)
const defaultPresetDiet = {
  Breakfast: [
    { n: "Poha", c: "Breakfast", s: "1 plate (150g)", k: 180 },
    { n: "Banana", c: "Fruits", s: "1 medium (120g)", k: 105 },
    { n: "Milk", c: "Breakfast", s: "1 glass (200ml)", k: 120 }
  ],
  Lunch: [
    { n: "Steamed Rice", c: "Rice", s: "1 cup cooked (180g)", k: 240 },
    { n: "Masoor Dal", c: "Dal", s: "1 bowl (200g)", k: 160 },
    { n: "Lau Tarkari", c: "Dry Veg", s: "1 serving (150g)", k: 90 },
    { n: "Mixed Vegetable Salad", c: "Salads", s: "1 bowl (200g)", k: 60 }
  ],
  EveningSnacks: [
    { n: "Roasted Chana", c: "Snacks", s: "1 handful (40g)", k: 150 }
  ],
  Dinner: [
    { n: "Roti", c: "Bread", s: "3 pieces", k: 300 },
    { n: "Soybean Curry", c: "Soybean", s: "1 bowl (200g)", k: 210 },
    { n: "Milk", c: "Breakfast", s: "1 glass (200ml)", k: 120 }
  ]
};

// Default 7-day weekday-specific diet plan mapping for Aman (Fat-Loss Diet)
const defaultWeeklyScheduleAman = {
  Monday: {
    Breakfast: [
      { n: "Poha", c: "Breakfast", s: "1 plate (150g)", k: 180 },
      { n: "Banana", c: "Fruits", s: "1 medium (120g)", k: 105 },
      { n: "Milk", c: "Breakfast", s: "1 glass (200ml)", k: 120 }
    ],
    Lunch: [
      { n: "Steamed Rice", c: "Rice", s: "1 cup cooked (180g)", k: 240 },
      { n: "Moong Dal", c: "Dal", s: "1 bowl (200g)", k: 150 },
      { n: "Lau Tarkari", c: "Dry Veg", s: "1 serving (150g)", k: 90 },
      { n: "Mixed Vegetable Salad", c: "Salads", s: "1 bowl (200g)", k: 60 }
    ],
    EveningSnacks: [
      { n: "Roasted Chana", c: "Snacks", s: "1 handful (40g)", k: 150 }
    ],
    Dinner: [
      { n: "Roti", c: "Bread", s: "3 pieces", k: 300 },
      { n: "Soybean Curry", c: "Soybean", s: "1 bowl (200g)", k: 210 },
      { n: "Mixed Vegetable Salad", c: "Salads", s: "1 bowl (200g)", k: 60 },
      { n: "Milk", c: "Breakfast", s: "1 glass (200ml)", k: 120 }
    ]
  },
  Tuesday: {
    Breakfast: [
      { n: "Suji Upma", c: "Breakfast", s: "1 plate (150g)", k: 200 },
      { n: "Banana", c: "Fruits", s: "1 medium (120g)", k: 105 },
      { n: "Milk", c: "Breakfast", s: "1 glass (200ml)", k: 120 }
    ],
    Lunch: [
      { n: "Steamed Rice", c: "Rice", s: "1 cup cooked (180g)", k: 240 },
      { n: "Masoor Dal", c: "Dal", s: "1 bowl (200g)", k: 160 },
      { n: "Bandhakopi Tarkari", c: "Bengali Sabji", s: "1 serving (150g)", k: 110 }
    ],
    EveningSnacks: [
      { n: "Roasted Chana", c: "Snacks", s: "1 handful (40g)", k: 150 }
    ],
    Dinner: [
      { n: "Roti", c: "Bread", s: "3 pieces", k: 300 },
      { n: "Soybean Curry", c: "Soybean", s: "1 bowl (200g)", k: 210 },
      { n: "Milk", c: "Breakfast", s: "1 glass (200ml)", k: 120 }
    ]
  },
  Wednesday: {
    Breakfast: [
      { n: "Oats Porridge", c: "Breakfast", s: "1 bowl (200g)", k: 150 },
      { n: "Banana", c: "Fruits", s: "1 medium (120g)", k: 105 },
      { n: "Milk", c: "Breakfast", s: "1 glass (200ml)", k: 120 }
    ],
    Lunch: [
      { n: "Steamed Rice", c: "Rice", s: "1 cup cooked (180g)", k: 240 },
      { n: "Chana Dal", c: "Dal", s: "1 bowl (200g)", k: 180 },
      { n: "Mixed Vegetable Curry", c: "Bengali Sabji", s: "1 bowl (200g)", k: 150 }
    ],
    EveningSnacks: [
      { n: "Roasted Chana", c: "Snacks", s: "1 handful (40g)", k: 150 }
    ],
    Dinner: [
      { n: "Roti", c: "Bread", s: "3 pieces", k: 300 },
      { n: "Soybean Curry", c: "Soybean", s: "1 bowl (200g)", k: 210 },
      { n: "Milk", c: "Breakfast", s: "1 glass (200ml)", k: 120 }
    ]
  },
  Thursday: {
    Breakfast: [
      { n: "Daliya", c: "Breakfast", s: "1 bowl (200g)", k: 150 },
      { n: "Banana", c: "Fruits", s: "1 medium (120g)", k: 105 },
      { n: "Milk", c: "Breakfast", s: "1 glass (200ml)", k: 120 }
    ],
    Lunch: [
      { n: "Steamed Rice", c: "Rice", s: "1 cup cooked (180g)", k: 240 },
      { n: "Moong Dal", c: "Dal", s: "1 bowl (200g)", k: 150 },
      { n: "Palak Sabji", c: "Bengali Sabji", s: "1 serving (150g)", k: 100 }
    ],
    EveningSnacks: [
      { n: "Roasted Chana", c: "Snacks", s: "1 handful (40g)", k: 150 }
    ],
    Dinner: [
      { n: "Roti", c: "Bread", s: "3 pieces", k: 300 },
      { n: "Soybean Curry", c: "Soybean", s: "1 bowl (200g)", k: 210 },
      { n: "Milk", c: "Breakfast", s: "1 glass (200ml)", k: 120 }
    ]
  },
  Friday: {
    Breakfast: [
      { n: "Poha", c: "Breakfast", s: "1 plate (150g)", k: 180 },
      { n: "Banana", c: "Fruits", s: "1 medium (120g)", k: 105 },
      { n: "Milk", c: "Breakfast", s: "1 glass (200ml)", k: 120 }
    ],
    Lunch: [
      { n: "Steamed Rice", c: "Rice", s: "1 cup cooked (180g)", k: 240 },
      { n: "Moong Dal", c: "Dal", s: "1 bowl (200g)", k: 150 },
      { n: "Aloo Gobi", c: "Dry Veg", s: "1 serving (150g)", k: 150 }
    ],
    EveningSnacks: [
      { n: "Roasted Chana", c: "Snacks", s: "1 handful (40g)", k: 150 }
    ],
    Dinner: [
      { n: "Roti", c: "Bread", s: "3 pieces", k: 300 },
      { n: "Soybean Curry", c: "Soybean", s: "1 bowl (200g)", k: 210 },
      { n: "Milk", c: "Breakfast", s: "1 glass (200ml)", k: 120 }
    ]
  },
  Saturday: {
    Breakfast: [
      { n: "Suji Upma", c: "Breakfast", s: "1 plate (150g)", k: 200 },
      { n: "Banana", c: "Fruits", s: "1 medium (120g)", k: 105 },
      { n: "Milk", c: "Breakfast", s: "1 glass (200ml)", k: 120 }
    ],
    Lunch: [
      { n: "Khichdi", c: "Rice", s: "1 bowl (250g)", k: 280 },
      { n: "Mixed Vegetable Salad", c: "Salads", s: "1 bowl (200g)", k: 60 }
    ],
    EveningSnacks: [
      { n: "Roasted Chana", c: "Snacks", s: "1 handful (40g)", k: 150 }
    ],
    Dinner: [
      { n: "Roti", c: "Bread", s: "3 pieces", k: 300 },
      { n: "Soybean Curry", c: "Soybean", s: "1 bowl (200g)", k: 210 },
      { n: "Milk", c: "Breakfast", s: "1 glass (200ml)", k: 120 }
    ]
  },
  Sunday: {
    Breakfast: [
      { n: "Oats Porridge", c: "Breakfast", s: "1 bowl (200g)", k: 150 },
      { n: "Banana", c: "Fruits", s: "1 medium (120g)", k: 105 },
      { n: "Milk", c: "Breakfast", s: "1 glass (200ml)", k: 120 }
    ],
    Lunch: [
      { n: "Steamed Rice", c: "Rice", s: "1 cup cooked (180g)", k: 240 },
      { n: "Moong Dal", c: "Dal", s: "1 bowl (200g)", k: 150 },
      { n: "Mixed Vegetable Curry", c: "Bengali Sabji", s: "1 bowl (200g)", k: 150 }
    ],
    EveningSnacks: [
      { n: "Sprouts Chaat", c: "Snacks", s: "1 plate (100g)", k: 100 }
    ],
    Dinner: [
      { n: "Khichdi", c: "Rice", s: "1 bowl (250g)", k: 280 },
      { n: "Mishti Doi", c: "Bengali Sweets", s: "1 cup (150g)", k: 180 },
      { n: "Milk", c: "Breakfast", s: "1 glass (200ml)", k: 120 }
    ]
  }
};

// Default 7-day weekday-specific diet plan mapping for Rishit (Aman's + Extra portion)
const defaultWeeklyScheduleRishit = JSON.parse(JSON.stringify(defaultWeeklyScheduleAman));
Object.keys(defaultWeeklyScheduleRishit).forEach(day => {
  const dayPlan = defaultWeeklyScheduleRishit[day];
  ["Breakfast", "Lunch", "EveningSnacks", "Dinner"].forEach(mealType => {
    dayPlan[mealType] = dayPlan[mealType].map(item => {
      // 1. rice: +0.5 cup (Steamed Rice k=360 instead of 240)
      if (item.n === "Steamed Rice") {
        return { n: "Steamed Rice", c: "Rice", s: "1.5 cups cooked (270g)", k: 360 };
      }
      // 2. roti: +1 roti (Roti k=400 instead of 300)
      if (item.n === "Roti" && item.k === 300) {
        return { n: "Roti", c: "Bread", s: "4 pieces", k: 400 };
      }
      // 3. roasted_chana: +10g (Roasted Chana k=190 instead of 150)
      if (item.n === "Roasted Chana") {
        return { n: "Roasted Chana", c: "Snacks", s: "1 handful (50g)", k: 190 };
      }
      return item;
    });
  });
});

// Joint monthly grocery items database representation
const monthlyGroceryItems = [
  { id: "g-rice", n: "Rice", q: "20 kg" },
  { id: "g-atta", n: "Atta (Whole Wheat Flour)", q: "15 kg" },
  { id: "g-moong", n: "Moong Dal", q: "2 kg" },
  { id: "g-masoor", n: "Masoor Dal", q: "2 kg" },
  { id: "g-chana", n: "Chana Dal", q: "2 kg" },
  { id: "g-soybean", n: "Soybean Chunks", q: "5 kg" },
  { id: "g-milk", n: "Milk", q: "45 Liters" },
  { id: "g-bananas", n: "Bananas", q: "90 pieces" },
  { id: "g-roasted-chana", n: "Roasted Chana", q: "3 kg" },
  { id: "g-veg", n: "Seasonal Vegetables", q: "Daily purchase" },
  { id: "g-cucumber", n: "Cucumber", q: "Daily purchase" },
  { id: "g-onion", n: "Onion", q: "Daily purchase" },
  { id: "g-tomato", n: "Tomato", q: "Daily purchase" }
];

// State variables for Diet Tracker
let amanDietData = null;
let rishitDietData = null;
let selectedDietDate = "";
let activeDietTab = "log"; // log, schedule, profile, reports
let dietSearchPage = 1;
const dietSearchPageSize = 8;

// Macro Calculation Helper: estimates P/C/F based on food categories and calories
function getFoodMacros(food) {
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

// Automatic migration utility to update legacy same-day schedules to new ReportLab plan
function migrateDietDataIfNecessary(data, user) {
  if (data && data.schedule && data.schedule.Monday && data.schedule.Tuesday) {
    const monItems = data.schedule.Monday.Breakfast.map(f => f.n).join(",");
    const tueItems = data.schedule.Tuesday.Breakfast.map(f => f.n).join(",");
    
    let needMigrate = false;
    
    // Check if it's the old layout
    if (monItems === tueItems && monItems === "Poha,Banana,Milk") {
      needMigrate = true;
    }
    
    // Also check if Aman's target calories is 2200, migrate to 2100
    if (user === "aman" && data.profile.targetCalories === 2200) {
      data.profile.targetCalories = 2100;
      needMigrate = true;
    }
    
    if (needMigrate) {
      data.schedule = JSON.parse(JSON.stringify(user === "aman" ? defaultWeeklyScheduleAman : defaultWeeklyScheduleRishit));
      return true;
    }
  }
  return false;
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
      targetCalories: isAman ? 2100 : 2300 // Aman is 2100, Rishit is 2300
    },
    meals: {}, // date -> { Breakfast: [], Lunch: [], EveningSnacks: [], Dinner: [] }
    schedule: JSON.parse(JSON.stringify(isAman ? defaultWeeklyScheduleAman : defaultWeeklyScheduleRishit))
  };
}

// Load separate databases from localStorage
function loadDietData() {
  const storedAman = localStorage.getItem("amanDietData");
  if (storedAman) {
    try { 
      amanDietData = JSON.parse(storedAman);
      if (migrateDietDataIfNecessary(amanDietData, "aman")) {
        localStorage.setItem("amanDietData", JSON.stringify(amanDietData));
      }
    }
    catch(e) { amanDietData = initDietData("aman"); }
  } else {
    amanDietData = initDietData("aman");
  }

  const storedRishit = localStorage.getItem("rishitDietData");
  if (storedRishit) {
    try { 
      rishitDietData = JSON.parse(storedRishit);
      if (migrateDietDataIfNecessary(rishitDietData, "rishit")) {
        localStorage.setItem("rishitDietData", JSON.stringify(rishitDietData));
      }
    }
    catch(e) { rishitDietData = initDietData("rishit"); }
  } else {
    rishitDietData = initDietData("rishit");
  }
}

// Save back to respective separate keys
function saveDietData() {
  localStorage.setItem("amanDietData", JSON.stringify(amanDietData));
  localStorage.setItem("rishitDietData", JSON.stringify(rishitDietData));
}

// Active user diet data selector
function getActiveDietData() {
  return currentUser === "aman" ? amanDietData : rishitDietData;
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
  if (!selectedDietDate) {
    selectedDietDate = selectedDate; // Sync with calendar date context
  }
  
  // Populate category filter dropdown if empty
  const filterSelect = document.getElementById("diet-cat-filter");
  if (filterSelect && filterSelect.options.length <= 1) {
    const cats = [...new Set(dietFoods.map(f => f.c))].sort();
    cats.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      filterSelect.appendChild(opt);
    });
  }

  // Switch Sub-tabs content show/hide
  const panels = ["log", "schedule", "profile", "reports"];
  panels.forEach(p => {
    const el = document.getElementById(`diet-panel-${p}`);
    if (el) el.style.display = (p === activeDietTab) ? "block" : "none";
    
    const btn = document.getElementById(`diet-tab-btn-${p}`);
    if (btn) btn.classList.toggle("active", p === activeDietTab);
  });

  // Show/Hide search panel (visible on Daily Log and Weekly Schedule tabs)
  const searchPanel = document.getElementById("diet-search-panel");
  if (searchPanel) {
    if (activeDietTab === "log" || activeDietTab === "schedule") {
      searchPanel.style.display = "block";
      const title = document.getElementById("diet-search-title");
      if (title) {
        title.textContent = activeDietTab === "log" 
          ? "Add Foods to Daily Log" 
          : `Add Foods to Weekly Schedule (${document.getElementById("diet-sched-day-select").value})`;
      }
    } else {
      searchPanel.style.display = "none";
    }
  }

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
  
  // Refresh search display
  onDietSearch();
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
  document.getElementById("diet-date-text").textContent = formatDateLong(selectedDietDate);
  document.getElementById("diet-date-picker").value = selectedDietDate;
  
  const targetCals = data.profile.targetCalories || 2000;
  document.getElementById("diet-val-target").textContent = `${targetCals} kcal`;
  
  // Compute logged items
  const meals = data.meals[selectedDietDate];
  let consumedCals = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  const mealTypes = ["Breakfast", "Lunch", "EveningSnacks", "Dinner"];
  
  mealTypes.forEach(type => {
    const listContainer = document.getElementById(type === "EveningSnacks" ? "meal-list-snacks" : `meal-list-${type.toLowerCase()}`);
    const calLabel = document.getElementById(type === "EveningSnacks" ? "meal-cal-snacks" : `meal-cal-${type.toLowerCase()}`);
    
    if (!listContainer) return;
    listContainer.innerHTML = "";
    
    let mealCals = 0;
    const items = meals[type] || [];
    
    if (items.length === 0) {
      listContainer.innerHTML = `<div class="meal-placeholder">No foods logged</div>`;
    } else {
      items.forEach((food, idx) => {
        mealCals += food.k;
        consumedCals += food.k;
        
        // Accumulate macros
        const macros = getFoodMacros(food);
        totalProtein += macros.protein;
        totalCarbs += macros.carbs;
        totalFat += macros.fat;
        
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
  document.getElementById("diet-val-consumed").textContent = `${consumedCals} kcal`;
  
  const remainingCals = targetCals - consumedCals;
  const remainingLabel = document.getElementById("diet-val-remaining");
  const remainingStatus = document.getElementById("diet-status-remaining");
  
  if (remainingCals >= 0) {
    remainingLabel.textContent = `${remainingCals} kcal`;
    remainingLabel.style.color = "var(--text-main)";
    remainingStatus.textContent = "Remaining to eat";
    remainingStatus.style.color = "var(--text-sub)";
  } else {
    remainingLabel.textContent = `${Math.abs(remainingCals)} kcal`;
    remainingLabel.style.color = "var(--danger)";
    remainingStatus.textContent = "Over calorie budget!";
    remainingStatus.style.color = "var(--danger)";
  }

  const pct = Math.min(100, Math.round((consumedCals / targetCals) * 100));
  document.getElementById("diet-pct-consumed").textContent = `${pct}% of target`;
  
  // Progress fill width
  const progressFill = document.getElementById("diet-progress-fill");
  if (progressFill) {
    progressFill.style.width = `${pct}%`;
    progressFill.style.background = (consumedCals > targetCals) ? "var(--danger)" : "var(--accent)";
  }
  document.getElementById("diet-progress-text").textContent = `${consumedCals} / ${targetCals} kcal`;

  // Macro progress totals
  document.getElementById("diet-protein-total").textContent = `${totalProtein}g`;
  document.getElementById("diet-carbs-total").textContent = `${totalCarbs}g`;
  document.getElementById("diet-fat-total").textContent = `${totalFat}g`;

  // Calculate percentage of typical macro splits: Protein (130g target), Carbs (250g target), Fat (70g target)
  const pPct = Math.min(100, Math.round((totalProtein / 130) * 100));
  const cPct = Math.min(100, Math.round((totalCarbs / 250) * 100));
  const fPct = Math.min(100, Math.round((totalFat / 70) * 100));

  document.getElementById("diet-protein-fill").style.width = `${pPct}%`;
  document.getElementById("diet-carbs-fill").style.width = `${cPct}%`;
  document.getElementById("diet-fat-fill").style.width = `${fPct}%`;

  // Refresh lucide icons inside logs
  lucide.createIcons();
}

// Delete food entry from log
function deleteFoodItem(type, index) {
  const data = getActiveDietData();
  
  if (activeDietTab === "log") {
    data.meals[selectedDietDate][type].splice(index, 1);
  } else if (activeDietTab === "schedule") {
    const day = document.getElementById("diet-sched-day-select").value;
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
    document.getElementById("diet-date-picker").value = selectedDietDate;
  }
}

// ── RENDER SUB-TAB 2: WEEKLY SCHEDULE ──
function renderWeeklySchedule() {
  const data = getActiveDietData();
  const day = document.getElementById("diet-sched-day-select").value;
  
  const schedule = data.schedule[day];
  const mealTypes = ["Breakfast", "Lunch", "EveningSnacks", "Dinner"];
  
  mealTypes.forEach(type => {
    const listContainer = document.getElementById(type === "EveningSnacks" ? "sched-list-snacks" : `sched-list-${type.toLowerCase()}`);
    const calLabel = document.getElementById(type === "EveningSnacks" ? "sched-cal-snacks" : `sched-cal-${type.toLowerCase()}`);
    
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
  
  lucide.createIcons();
}

// ── RENDER SUB-TAB 3: DIET PROFILE ──
function renderDietProfile() {
  const data = getActiveDietData();
  
  // Fetch latest weight dynamically from weights registry
  const weights = fitnessData[currentUser].weights || {};
  const dates = Object.keys(weights).sort();
  const latestWeight = dates.length ? weights[dates[dates.length - 1]] : data.profile.weight;
  
  document.getElementById("diet-prof-age").value = data.profile.age;
  document.getElementById("diet-prof-height").value = data.profile.height;
  document.getElementById("diet-prof-weight").value = latestWeight;
  document.getElementById("diet-prof-goal").value = data.profile.goalWeight;
  document.getElementById("diet-prof-target").value = data.profile.targetCalories;
}

// Profile Save handler
function saveDietProfile(event) {
  event.preventDefault();
  const data = getActiveDietData();
  
  const age = parseInt(document.getElementById("diet-prof-age").value);
  const height = parseInt(document.getElementById("diet-prof-height").value);
  const weight = parseFloat(document.getElementById("diet-prof-weight").value);
  const goal = parseFloat(document.getElementById("diet-prof-goal").value);
  const target = parseInt(document.getElementById("diet-prof-target").value);
  
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
  ensureDietDateRecord(data, selectedDietDate);
  const todayMeals = data.meals[selectedDietDate];
  let todayCals = 0;
  ["Breakfast", "Lunch", "EveningSnacks", "Dinner"].forEach(type => {
    (todayMeals[type] || []).forEach(f => todayCals += f.k);
  });
  
  document.getElementById("diet-report-today").textContent = `${todayCals} kcal`;
  
  // Gather active logs history
  const activeDates = Object.keys(data.meals).filter(d => {
    let dayTotal = 0;
    ["Breakfast", "Lunch", "EveningSnacks", "Dinner"].forEach(t => {
      (data.meals[d][t] || []).forEach(f => dayTotal += f.k);
    });
    return dayTotal > 0;
  }).sort();
  
  // Calculate Weekly Average (past 7 active days)
  let weeklySum = 0;
  const weeklyDates = activeDates.slice(-7);
  weeklyDates.forEach(d => {
    ["Breakfast", "Lunch", "EveningSnacks", "Dinner"].forEach(t => {
      (data.meals[d][t] || []).forEach(f => weeklySum += f.k);
    });
  });
  const weeklyAvg = weeklyDates.length ? Math.round(weeklySum / weeklyDates.length) : 0;
  document.getElementById("diet-report-weekly-avg").textContent = `${weeklyAvg} kcal`;
  
  // Calculate Monthly Average (past 30 active days)
  let monthlySum = 0;
  const monthlyDates = activeDates.slice(-30);
  monthlyDates.forEach(d => {
    ["Breakfast", "Lunch", "EveningSnacks", "Dinner"].forEach(t => {
      (data.meals[d][t] || []).forEach(f => monthlySum += f.k);
    });
  });
  const monthlyAvg = monthlyDates.length ? Math.round(monthlySum / monthlyDates.length) : 0;
  document.getElementById("diet-report-monthly-avg").textContent = `${monthlyAvg} kcal`;
  

  
  // History table population
  const tbody = document.getElementById("diet-history-tbody");
  tbody.innerHTML = "";
  
  if (activeDates.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No meals recorded yet.</td></tr>`;
  } else {
    // Reverse chronological order
    const reverseDates = [...activeDates].reverse();
    reverseDates.forEach(d => {
      let dayTotal = 0;
      let pTotal = 0, cTotal = 0, fTotal = 0;
      
      ["Breakfast", "Lunch", "EveningSnacks", "Dinner"].forEach(t => {
        (data.meals[d][t] || []).forEach(f => {
          dayTotal += f.k;
          const mac = getFoodMacros(f);
          pTotal += mac.protein;
          cTotal += mac.carbs;
          fTotal += mac.fat;
        });
      });
      
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
  renderGroceryChecklist();
}

// Render the monthly grocery checklist inside the Reports page
function renderGroceryChecklist() {
  const container = document.getElementById("grocery-checklist-container");
  if (!container) return;
  container.innerHTML = "";
  
  const checkedStates = JSON.parse(localStorage.getItem("duogym_grocery_checklist") || "{}");
  
  monthlyGroceryItems.forEach(item => {
    const isChecked = checkedStates[item.id] ? "checked" : "";
    const labelStyle = checkedStates[item.id] ? "text-decoration: line-through; color: var(--text-muted);" : "color: var(--text-main);";
    
    const div = document.createElement("div");
    div.style = "display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); border-radius: var(--radius-sm); transition: var(--transition);";
    div.innerHTML = `
      <input type="checkbox" id="${item.id}" ${isChecked} onchange="toggleGroceryItem('${item.id}')" style="cursor: pointer; width: 16px; height: 16px; accent-color: var(--accent);">
      <label for="${item.id}" style="cursor: pointer; font-size: 13px; font-weight: 500; ${labelStyle} flex-grow: 1; display: flex; justify-content: space-between; gap: 8px; margin: 0;">
        <span>${item.n}</span>
        <strong style="color: var(--accent);">${item.q}</strong>
      </label>
    `;
    container.appendChild(div);
  });
}

// Toggle grocery checklist checkbox state
function toggleGroceryItem(id) {
  const checkedStates = JSON.parse(localStorage.getItem("duogym_grocery_checklist") || "{}");
  checkedStates[id] = !checkedStates[id];
  localStorage.setItem("duogym_grocery_checklist", JSON.stringify(checkedStates));
  renderGroceryChecklist();
}

// ── FOOD DATABASE SEARCH & PAGINATION CONTROLLER ──
function onDietSearch() {
  const query = document.getElementById("diet-search-input").value.toLowerCase();
  const filterCat = document.getElementById("diet-cat-filter").value;
  const sortBy = document.getElementById("diet-sort-select").value;
  
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
  
  const tbody = document.getElementById("diet-search-tbody");
  tbody.innerHTML = "";
  
  if (pageSlice.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 12px;">No food matches found.</td></tr>`;
  } else {
    pageSlice.forEach((f, idx) => {
      const macros = getFoodMacros(f);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: 500; color: var(--text-main);">${f.n}</td>
        <td><span style="font-size: 11px; padding: 2px 8px; border-radius: 99px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); color: var(--text-sub);">${f.c}</span></td>
        <td style="color: var(--text-sub); font-size: 12px;">${f.s}</td>
        <td style="font-weight: 700; color: var(--accent);">${f.k} kcal <span style="display:block; font-size:9px; font-weight:normal; color:var(--text-muted);">P:${macros.protein}g C:${macros.carbs}g F:${macros.fat}g</span></td>
        <td style="text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
            <select class="diet-add-select" id="add-meal-sel-${idx}">
              <option value="Breakfast">Breakfast</option>
              <option value="Lunch">Lunch</option>
              <option value="EveningSnacks">Snacks</option>
              <option value="Dinner">Dinner</option>
            </select>
            <button class="btn btn-primary diet-add-btn" onclick="addSearchedFood('${f.n}', ${idx})">
              <i data-lucide="plus" style="width: 10px; height: 10px;"></i> Add
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  document.getElementById("diet-page-info").textContent = `Page ${dietSearchPage} of ${totalPages}`;
  document.getElementById("diet-showing-info").textContent = `(${total} items)`;
  document.getElementById("diet-prev-btn").disabled = dietSearchPage <= 1;
  document.getElementById("diet-next-btn").disabled = dietSearchPage >= totalPages;
  
  lucide.createIcons();
}

function changeDietPage(dir) {
  dietSearchPage += dir;
  onDietSearch();
}

// Add searched food selection to daily log or schedule
function addSearchedFood(foodName, selectIndex) {
  const food = dietFoods.find(f => f.n === foodName);
  if (!food) return;
  
  const selElement = document.getElementById(`add-meal-sel-${selectIndex}`);
  let mealType = selElement.value;
  if (mealType === "Snacks") mealType = "EveningSnacks";
  
  const data = getActiveDietData();
  
  if (activeDietTab === "log") {
    // Future log prevention check
    const todayStr = dateToYYYYMMDD(new Date());
    if (selectedDietDate > todayStr) {
      alert("You cannot log diet items for future dates!");
      return;
    }
    
    ensureDietDateRecord(data, selectedDietDate);
    data.meals[selectedDietDate][mealType].push({
      n: food.n,
      c: food.c,
      s: food.s,
      k: food.k
    });
  } else if (activeDietTab === "schedule") {
    const day = document.getElementById("diet-sched-day-select").value;
    data.schedule[day][mealType].push({
      n: food.n,
      c: food.c,
      s: food.s,
      k: food.k
    });
  }
  
  saveDietData();
  renderDietTracker();
}

// ── PRESET PLAN LOADERS ──
function loadPresetPlanToday() {
  const todayStr = dateToYYYYMMDD(new Date());
  if (selectedDietDate > todayStr) {
    alert("You cannot log preset items for future dates!");
    return;
  }

  if (confirm("Load default fat-loss plan (Poha, Rice/Dal/Veg, Roasted Chana, Roti/Soybean) into today's log? This will append to your current log.")) {
    const data = getActiveDietData();
    ensureDietDateRecord(data, selectedDietDate);
    
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
  
  if (confirm(`Load your custom scheduled ${dayName} plan into today's log? This will append to your current log.`)) {
    const data = getActiveDietData();
    ensureDietDateRecord(data, selectedDietDate);
    
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
   13. INITIALIZATION ON LOAD
   ============================================================ */
window.addEventListener("DOMContentLoaded", () => {
  // Load data from storage
  loadData();

  // Detect today's date in local time
  const todayStr = dateToYYYYMMDD(new Date());

  // Default selected date to today if inside subscription range, else default to START_DATE
  if (isWithinSubscription(todayStr)) {
    selectedDate = todayStr;
  } else {
    selectedDate = START_DATE_STR;
  }

  // Draw initial page elements
  switchUser("aman"); // Default dashboard opens on Aman
  switchPage("summary");

  // Register PWA Service Worker for offline support and quick loads
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => {
        console.log("Service Worker Registered");
        
        // Listen for updates on the installing worker
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

    // Listen for controller changes (new service worker takes over)
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        console.log("Service Worker updated, reloading page...");
        window.location.reload();
      }
    });
  }
});
