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
const exerciseInstructions = {
  "warm-up": {
    name: "Warm-Up Routine",
    steps: [
      "Light treadmill walking or cycling for 5 minutes.",
      "Dynamic stretches: arm circles, leg swings, hip openers.",
      "Keep movement light to warm joints and raise heart rate."
    ],
    tips: "Do not perform static stretching before lifting; keep movements dynamic."
  },
  "push-ups": {
    name: "Push-ups",
    steps: [
      "Start in a plank position with hands slightly wider than shoulders.",
      "Lower chest towards the floor, keeping elbows at a 45-degree angle.",
      "Push straight back up to full extension."
    ],
    tips: "Ensure core and glutes are fully engaged. Don't let hips sag."
  },
  "db-bench-press": {
    name: "Dumbbell Bench Press",
    steps: [
      "Lie flat on bench, hold dumbbells at chest level.",
      "Press dumbbells straight up, keeping wrists aligned.",
      "Lower dumbbells slowly until elbows are just past 90 degrees."
    ],
    tips: "Squeeze shoulder blades together and keep feet flat on the floor."
  },
  "incline-db-press": {
    name: "Incline Dumbbell Press",
    steps: [
      "Set bench to 30-45 degrees, lie back with dumbbells.",
      "Press dumbbells straight up above upper chest.",
      "Lower the weights slowly to shoulder level."
    ],
    tips: "Focus on upper chest contraction. Avoid flaring elbows out."
  },
  "chest-fly": {
    name: "Chest Fly",
    steps: [
      "Lie on flat bench, dumbbells extended above chest.",
      "Lower weights out to the sides in a wide arc.",
      "Squeeze chest to return weights back to center."
    ],
    tips: "Keep a slight, static bend in your elbows. Stretch, don't press."
  },
  "tricep-pushdown": {
    name: "Tricep Pushdown",
    steps: [
      "Stand facing cable, grab attachment with overhand grip.",
      "Push cable down extending arms fully.",
      "Slowly return to start, flexing elbow to 90 degrees."
    ],
    tips: "Keep elbows pinned to your ribs throughout the movement."
  },
  "overhead-tricep-ext": {
    name: "Overhead Dumbbell Tricep Extension",
    steps: [
      "Hold dumbbell overhead with both hands.",
      "Lower the weight behind head by bending elbows.",
      "Extend elbows to press dumbbells back overhead."
    ],
    tips: "Keep elbows close to head and pointing forward, not flared out."
  },
  "incline-walk": {
    name: "Incline Treadmill Walk",
    steps: [
      "Set treadmill incline to 5-10%.",
      "Walk at a steady, brisk pace (3.0-3.5 mph).",
      "Pump arms naturally to support breathing."
    ],
    tips: "Avoid holding onto handrails; let your core and legs support you."
  },
  "cool-down": {
    name: "Cool-Down Routine",
    steps: [
      "Perform gentle static stretches for chest, back, and hamstrings.",
      "Hold each stretch for 20-30 seconds without bouncing.",
      "Focus on slow deep breathing to lower heart rate."
    ],
    tips: "Static stretching is perfect here to improve flexibility and recovery."
  },
  "lat-pulldown": {
    name: "Lat Pulldown",
    steps: [
      "Grip pulldown bar wider than shoulder-width.",
      "Pull bar down to upper chest, leading with elbows.",
      "Slowly return bar back to start with control."
    ],
    tips: "Pull from your elbows, squeeze shoulder blades down and back."
  },
  "db-row": {
    name: "One-Arm Dumbbell Row",
    steps: [
      "Place one knee and hand on flat bench, hold dumbbell in other hand.",
      "Pull dumbbell up to hip level, leading with elbow.",
      "Lower dumbbell straight down under control."
    ],
    tips: "Keep back flat and neck neutral. Pull towards your hip, not chest."
  },
  "seated-row": {
    name: "Seated Cable Row",
    steps: [
      "Sit at rowing station, grip handle attachment.",
      "Pull attachment to lower stomach, keeping spine straight.",
      "Slowly return arms back to straight start position."
    ],
    tips: "Squeeze shoulder blades at contraction; do not use torso momentum."
  },
  "face-pulls": {
    name: "Face Pulls",
    steps: [
      "Grip rope attachment at chest height, step back.",
      "Pull rope towards forehead, separating hands.",
      "Hold briefly, feeling contraction in upper back."
    ],
    tips: "Keep chest up and elbows flared high. Great for rear delts and posture."
  },
  "rear-delt-fly": {
    name: "Rear Delt Fly",
    steps: [
      "Sit on edge of bench, hinge forward from hips.",
      "Raise dumbbells out to sides, keeping slight elbow bend.",
      "Lower weights back down slowly."
    ],
    tips: "Focus on upper back contraction. Avoid using momentum."
  },
  "db-curl": {
    name: "Dumbbell Curl",
    steps: [
      "Hold dumbbells at sides, palms facing in.",
      "Curl weights up while rotating palms to face forward.",
      "Lower dumbbells back to sides with control."
    ],
    tips: "Keep elbows locked close to your sides throughout the curl."
  },
  "hammer-curl": {
    name: "Hammer Curl",
    steps: [
      "Hold dumbbells at sides with palms facing in.",
      "Curl weights up, keeping palms facing in (neutral grip).",
      "Lower dumbbells back down slowly."
    ],
    tips: "Keep wrists straight and do not swing the body."
  },
  "walking-cycling": {
    name: "Brisk Walk or Cycling",
    steps: [
      "Walk briskly outdoors/treadmill or cycle at moderate pace.",
      "Maintain active recovery breathing."
    ],
    tips: "Recovery-focused cardio. Keep effort level moderate."
  },
  "goblet-squat": {
    name: "Goblet Squat",
    steps: [
      "Hold dumbbell vertically against chest.",
      "Squat down until thighs are parallel to floor.",
      "Push through heels to return to standing position."
    ],
    tips: "Keep your chest up and weight on your heels. Avoid knee valgus."
  },
  "leg-press": {
    name: "Leg Press",
    steps: [
      "Sit in machine, place feet shoulder-width on platform.",
      "Lower platform until knees are bent to 90 degrees.",
      "Push platform away extending legs."
    ],
    tips: "Do not lock out your knees at the top. Keep feet flat."
  },
  "walking-lunges": {
    name: "Walking Lunges",
    steps: [
      "Step forward and lower hips until back knee is near floor.",
      "Drive through front heel to step forward into next lunge.",
      "Alternate legs continuously."
    ],
    tips: "Keep front knee tracked over ankle. Maintain upright posture."
  },
  "romanian-deadlift": {
    name: "Romanian Deadlift",
    steps: [
      "Stand holding weights in front of thighs.",
      "Hinge hips back, lowering weights down along shins.",
      "Squeeze glutes and hamstrings to return to upright."
    ],
    tips: "Keep back flat and neck neutral. Hinge hips, do not squat."
  },
  "leg-curl": {
    name: "Leg Curl",
    steps: [
      "Position roller pad behind ankles.",
      "Curl heels towards glutes contracting hamstrings.",
      "Slowly return pad back to starting position."
    ],
    tips: "Keep hips pressed flat against the pad. Control the eccentric phase."
  },
  "calf-raise": {
    name: "Calf Raises",
    steps: [
      "Stand on edge of platform on balls of feet.",
      "Raise up on toes as high as possible.",
      "Lower heels down below platform level."
    ],
    tips: "Hold the bottom stretch for 1 second and the top squeeze for 1 second."
  },
  "plank": {
    name: "Plank",
    steps: [
      "Rest forearms on floor, extend legs behind.",
      "Hold body in a straight line parallel to floor.",
      "Engage core and hold position."
    ],
    tips: "Breathe continuously. Squeeze glutes and core to protect lower back."
  },
  "leg-raises": {
    name: "Leg Raises",
    steps: [
      "Lie on back, hands under glutes.",
      "Raise legs straight up until vertical.",
      "Lower legs back down slowly, keeping back flat."
    ],
    tips: "Do not let lower back arch off the floor as you lower legs."
  },
  "db-shoulder-press": {
    name: "Dumbbell Shoulder Press",
    steps: [
      "Hold dumbbells at shoulder level, elbows bent.",
      "Press weights straight up overhead.",
      "Lower dumbbells back to shoulders under control."
    ],
    tips: "Keep wrists stacked directly over elbows. Engage core."
  },
  "lateral-raises": {
    name: "Lateral Raises",
    steps: [
      "Hold dumbbells at sides.",
      "Raise arms out to sides with a slight elbow bend.",
      "Lower dumbbells back to sides slowly."
    ],
    tips: "Lead with elbows. Tilt weights slightly forward at top."
  },
  "front-raises": {
    name: "Front Raises",
    steps: [
      "Hold dumbbells in front of thighs.",
      "Raise weights straight forward to shoulder height.",
      "Lower back down slowly."
    ],
    tips: "Minimize body swing. Control the movement."
  },
  "upright-row": {
    name: "Upright Row",
    steps: [
      "Hold weights in front of thighs.",
      "Pull weights up to chest level, leading with elbows.",
      "Lower weights back down slowly."
    ],
    tips: "Keep weights close to body. Keep elbows higher than wrists."
  },
  "shrugs": {
    name: "Shrugs",
    steps: [
      "Hold dumbbells at sides.",
      "Elevate shoulders straight up towards ears.",
      "Hold briefly, then lower slowly."
    ],
    tips: "Do not roll your shoulders. Move straight up and down."
  },
  "dead-bug": {
    name: "Dead Bug",
    steps: [
      "Lie on back, arms pointing up, knees bent at 90 degrees.",
      "Lower opposite arm and leg toward floor slowly.",
      "Return to start, then repeat on opposite side."
    ],
    tips: "Press lower back flat against floor. Do not let lower back arch."
  },
  "side-plank": {
    name: "Side Plank",
    steps: [
      "Lie on side, prop torso on elbow.",
      "Raise hips until body is straight.",
      "Hold position while breathing steadily."
    ],
    tips: "Keep elbow directly under shoulder. Hips stacked and high."
  },
  "squat-variation": {
    name: "Squat Variation",
    steps: [
      "Stand with feet shoulder-width.",
      "Lower hips back and down like sitting in a chair.",
      "Drive through heels to stand back up."
    ],
    tips: "Keep chest up and knees aligned with toes."
  },
  "hip-thrust": {
    name: "Hip Thrust",
    steps: [
      "Upper back on bench, barbell or weight on hips.",
      "Drive through heels to raise hips flat.",
      "Lower hips down under control."
    ],
    tips: "Tuck chin, squeeze glutes at the top."
  },
  "leg-extension": {
    name: "Leg Extension",
    steps: [
      "Position ankles behind roller pad.",
      "Extend legs straight out, contracting thighs.",
      "Lower pad slowly back to start."
    ],
    tips: "Squeeze quads at top. Maintain flat back on seat."
  },
  "rope-tricep-pushdown": {
    name: "Rope Tricep Pushdown",
    steps: [
      "Hold rope ends, elbows locked at sides.",
      "Push down, separating rope ends at bottom.",
      "Return slowly to start."
    ],
    tips: "Flex triceps hard at bottom lock-out."
  },
  "cycling-treadmill": {
    name: "Cycling or Incline treadmill",
    steps: [
      "Cycle at moderate resistance or walk on incline.",
      "Maintain active recovery heart rate."
    ],
    tips: "A good aerobic burn session to wrap up."
  },
  "walking": {
    name: "Recovery Walk",
    steps: [
      "Walk at comfortable pace outdoors or on treadmill.",
      "Support blood flow and active recovery."
    ],
    tips: "Low intensity walk to enhance recovery."
  },
  "light-stretching": {
    name: "Light stretching",
    steps: [
      "Static stretches focusing on major muscles.",
      "Do not stretch to the point of pain."
    ],
    tips: "Perfect for flexibility and relaxation."
  },
  "mobility-work": {
    name: "Mobility work",
    steps: [
      "Dynamic movements: hip openers, cat-cow, thoracic twists.",
      "Work through active joint ranges of motion."
    ],
    tips: "Improves joint health and ease of movement."
  }
};

/* ============================================================
   3. WEEKLY WORKOUT SCHEDULE (weeklySchedule)
   ============================================================ */
const weeklySchedule = [
  {
    day: "Monday",
    type: "Chest + Triceps",
    focus: "Build chest shape, pushing strength, arm size",
    exercises: [
      { name: "Warm-Up (8-10 min)", sets: "", reps: "Stretch & Mobility", exerciseId: "warm-up" },
      { name: "Push-ups", sets: "3", reps: "8-12", exerciseId: "push-ups" },
      { name: "Dumbbell Bench Press", sets: "4", reps: "8-10", exerciseId: "db-bench-press" },
      { name: "Incline Dumbbell Press", sets: "3", reps: "10", exerciseId: "incline-db-press" },
      { name: "Chest Fly", sets: "3", reps: "12", exerciseId: "chest-fly" },
      { name: "Tricep Pushdown", sets: "3", reps: "12", exerciseId: "tricep-pushdown" },
      { name: "Overhead Dumbbell Tricep Extension", sets: "3", reps: "10-12", exerciseId: "overhead-tricep-ext" },
      { name: "Incline Treadmill Walk (Cardio)", sets: "", reps: "15-20 Min", exerciseId: "incline-walk" },
      { name: "Cool-Down (3-5 min)", sets: "", reps: "Static Stretching", exerciseId: "cool-down" }
    ]
  },
  {
    day: "Tuesday",
    type: "Back + Biceps + Rear Delts",
    focus: "Improve posture, width, and pulling strength",
    exercises: [
      { name: "Warm-Up (8-10 min)", sets: "", reps: "Stretch & Mobility", exerciseId: "warm-up" },
      { name: "Lat Pulldown", sets: "4", reps: "10", exerciseId: "lat-pulldown" },
      { name: "One-Arm Dumbbell Row", sets: "3", reps: "10 each", exerciseId: "db-row" },
      { name: "Seated Cable Row", sets: "3", reps: "10", exerciseId: "seated-row" },
      { name: "Face Pulls", sets: "3", reps: "15", exerciseId: "face-pulls" },
      { name: "Rear Delt Fly", sets: "3", reps: "12-15", exerciseId: "rear-delt-fly" },
      { name: "Dumbbell Curl", sets: "3", reps: "12", exerciseId: "db-curl" },
      { name: "Hammer Curl", sets: "3", reps: "10-12", exerciseId: "hammer-curl" },
      { name: "Brisk Walk or Cycling (Cardio)", sets: "", reps: "15 Min", exerciseId: "walking-cycling" },
      { name: "Cool-Down (3-5 min)", sets: "", reps: "Static Stretching", exerciseId: "cool-down" }
    ]
  },
  {
    day: "Wednesday",
    type: "Legs + Calves + Core",
    focus: "Fat burning, lower-body strength, better balance",
    exercises: [
      { name: "Warm-Up (8-10 min)", sets: "", reps: "Stretch & Mobility", exerciseId: "warm-up" },
      { name: "Goblet Squat", sets: "4", reps: "10-12", exerciseId: "goblet-squat" },
      { name: "Leg Press", sets: "4", reps: "12", exerciseId: "leg-press" },
      { name: "Walking Lunges", sets: "3", reps: "20 steps", exerciseId: "walking-lunges" },
      { name: "Romanian Deadlift", sets: "3", reps: "10", exerciseId: "romanian-deadlift" },
      { name: "Leg Curl", sets: "3", reps: "12", exerciseId: "leg-curl" },
      { name: "Standing Calf Raise", sets: "4", reps: "15", exerciseId: "calf-raise" },
      { name: "Plank", sets: "3", reps: "30-45 sec", exerciseId: "plank" },
      { name: "Leg Raises", sets: "3", reps: "12", exerciseId: "leg-raises" },
      { name: "Easy Treadmill Walk (Cardio)", sets: "", reps: "10-15 Min", exerciseId: "walking" },
      { name: "Cool-Down (3-5 min)", sets: "", reps: "Static Stretching", exerciseId: "cool-down" }
    ]
  },
  {
    day: "Thursday",
    type: "Shoulders + Traps + Core",
    focus: "Broader look, better frame, better posture",
    exercises: [
      { name: "Warm-Up (8-10 min)", sets: "", reps: "Stretch & Mobility", exerciseId: "warm-up" },
      { name: "Dumbbell Shoulder Press", sets: "4", reps: "10", exerciseId: "db-shoulder-press" },
      { name: "Lateral Raises", sets: "4", reps: "15", exerciseId: "lateral-raises" },
      { name: "Front Raises", sets: "3", reps: "12", exerciseId: "front-raises" },
      { name: "Upright Row", sets: "3", reps: "10", exerciseId: "upright-row" },
      { name: "Shrugs", sets: "3", reps: "12", exerciseId: "shrugs" },
      { name: "Face Pulls", sets: "3", reps: "15", exerciseId: "face-pulls" },
      { name: "Dead Bug", sets: "3", reps: "12", exerciseId: "dead-bug" },
      { name: "Side Plank", sets: "3", reps: "20-30 sec", exerciseId: "side-plank" },
      { name: "Incline Walk (Cardio)", sets: "", reps: "15-20 Min", exerciseId: "incline-walk" },
      { name: "Cool-Down (3-5 min)", sets: "", reps: "Static Stretching", exerciseId: "cool-down" }
    ]
  },
  {
    day: "Friday",
    type: "Upper Body Mix",
    focus: "Extra volume for chest, back, shoulders",
    exercises: [
      { name: "Warm-Up (8-10 min)", sets: "", reps: "Stretch & Mobility", exerciseId: "warm-up" },
      { name: "Dumbbell Bench Press", sets: "3", reps: "10", exerciseId: "db-bench-press" },
      { name: "Lat Pulldown", sets: "3", reps: "10", exerciseId: "lat-pulldown" },
      { name: "Incline Dumbbell Press", sets: "3", reps: "10", exerciseId: "incline-db-press" },
      { name: "Seated Row", sets: "3", reps: "10", exerciseId: "seated-row" },
      { name: "Lateral Raises", sets: "3", reps: "15", exerciseId: "lateral-raises" },
      { name: "Face Pulls", sets: "3", reps: "15", exerciseId: "face-pulls" },
      { name: "Dumbbell Curl", sets: "2", reps: "12", exerciseId: "db-curl" },
      { name: "Tricep Pushdown", sets: "2", reps: "12", exerciseId: "tricep-pushdown" },
      { name: "Treadmill Walk (Cardio)", sets: "", reps: "15-20 Min", exerciseId: "walking" },
      { name: "Cool-Down (3-5 min)", sets: "", reps: "Static Stretching", exerciseId: "cool-down" }
    ]
  },
  {
    day: "Saturday",
    type: "Legs + Glutes + Arms",
    focus: "Extra calorie burn, full-body conditioning",
    exercises: [
      { name: "Warm-Up (8-10 min)", sets: "", reps: "Stretch & Mobility", exerciseId: "warm-up" },
      { name: "Squat variation", sets: "3", reps: "10", exerciseId: "squat-variation" },
      { name: "Leg Press", sets: "3", reps: "12", exerciseId: "leg-press" },
      { name: "Glute Bridge or Hip Thrust", sets: "3", reps: "12", exerciseId: "hip-thrust" },
      { name: "Leg Extension", sets: "3", reps: "12", exerciseId: "leg-extension" },
      { name: "Calf Raise", sets: "4", reps: "15", exerciseId: "calf-raise" },
      { name: "Hammer Curl", sets: "3", reps: "12", exerciseId: "hammer-curl" },
      { name: "Rope Tricep Pushdown", sets: "3", reps: "12", exerciseId: "rope-tricep-pushdown" },
      { name: "Plank", sets: "3", reps: "45 sec", exerciseId: "plank" },
      { name: "Cycling or Incline Treadmill (Cardio)", sets: "", reps: "15-20 Min", exerciseId: "cycling-treadmill" },
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
  
  // Save selected user to localStorage
  localStorage.setItem("duogym_selected_user", user);
  
  // Update body css class for accent colors
  document.body.className = `user-${user}`;

  // Update tabs DOM classes
  const tabAman = document.getElementById("tab-user-aman");
  const tabRishit = document.getElementById("tab-user-rishit");
  if (tabAman) tabAman.classList.toggle("active", user === "aman");
  if (tabRishit) tabRishit.classList.toggle("active", user === "rishit");

  // Re-render the active page elements
  updatePageContent();
}

// Switch between page panels (Today only)
function switchPage(pageId) {
  activePage = pageId;

  // Toggle active styling on navigation buttons
  const navIds = ["today"];
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
  clearAllRunningTimers();
  if (activePage === "today") {
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
    } else {
      timerDisplay.textContent = displayVal;
      if (isCounting) {
        timerDisplay.classList.add("counting");
      }
    }

    const timerBtn = document.createElement("button");
    timerBtn.className = "btn-timer-play";
    timerBtn.id = `timer-btn-${ex.exerciseId}`;
    timerBtn.style.display = isChecked ? "none" : "flex";
    
    if (isCounting) {
      timerBtn.innerHTML = `<i data-lucide="pause" style="width: 14px; height: 14px;"></i>`;
    } else {
      timerBtn.innerHTML = `<i data-lucide="play" style="width: 14px; height: 14px;"></i>`;
    }
    
    timerBtn.onclick = (e) => {
      e.stopPropagation(); // Prevent toggling the checklist row check state
      toggleInlineTimer(ex.exerciseId, ex.reps);
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

    checklistContainer.appendChild(row);
  });



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
    playSuccessSound(); // Play motivational chime sound
    
    // Stop running timer if checked manually
    const timer = activeTimers[exerciseId];
    if (timer) {
      if (timer.intervalId) clearInterval(timer.intervalId);
      delete activeTimers[exerciseId];
    }
  } else {
    record.completedExercises.splice(index, 1);
    
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

/* ── RENDER BACKUP MANAGER ────────────────────────────────── */
function renderNotes() {
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
// Default preset diet plan mapping (Fat-loss base plan - Monday)
const defaultPresetDiet = {
  Breakfast: [
    { n: "Poha", c: "Breakfast", s: "1 Plate", k: 300 },
    { n: "Banana", c: "Fruits", s: "1 Medium", k: 105 },
    { n: "Milk", c: "Breakfast", s: "250ml", k: 150 }
  ],
  Lunch: [
    { n: "Rice", c: "Rice", s: "1.5 Cups", k: 300 },
    { n: "Moong Dal", c: "Dal", s: "1 Bowl", k: 180 },
    { n: "Lau Ghonto", c: "Dry Veg", s: "1 Bowl", k: 100 },
    { n: "Salad", c: "Salads", s: "1 Plate", k: 40 }
  ],
  EveningSnacks: [
    { n: "Roasted Chana", c: "Snacks", s: "40g", k: 150 }
  ],
  Dinner: [
    { n: "Roti", c: "Bread", s: "3", k: 360 },
    { n: "Soybean Curry", c: "Soybean", s: "1 Bowl", k: 350 },
    { n: "Salad", c: "Salads", s: "1 Plate", k: 45 },
    { n: "Milk (Before Sleep)", c: "Breakfast", s: "250ml", k: 150 }
  ]
};

// Default 7-day weekday-specific diet plan mapping for Aman (Dietician Fat-Loss Diet)
const defaultWeeklyScheduleAman = {
  Monday: {
    Breakfast: [
      { n: "Poha", c: "Breakfast", s: "1 Plate", k: 300 },
      { n: "Banana", c: "Fruits", s: "1 Medium", k: 105 },
      { n: "Milk", c: "Breakfast", s: "250ml", k: 150 }
    ],
    Lunch: [
      { n: "Rice", c: "Rice", s: "1.5 Cups", k: 300 },
      { n: "Moong Dal", c: "Dal", s: "1 Bowl", k: 180 },
      { n: "Lau Ghonto", c: "Dry Veg", s: "1 Bowl", k: 100 },
      { n: "Salad", c: "Salads", s: "1 Plate", k: 40 }
    ],
    EveningSnacks: [
      { n: "Roasted Chana", c: "Snacks", s: "40g", k: 150 }
    ],
    Dinner: [
      { n: "Roti", c: "Bread", s: "3", k: 360 },
      { n: "Soybean Curry", c: "Soybean", s: "1 Bowl", k: 350 },
      { n: "Salad", c: "Salads", s: "1 Plate", k: 45 },
      { n: "Milk (Before Sleep)", c: "Breakfast", s: "250ml", k: 150 }
    ]
  },
  Tuesday: {
    Breakfast: [
      { n: "Upma", c: "Breakfast", s: "1 Plate", k: 320 },
      { n: "Banana", c: "Fruits", s: "1", k: 105 },
      { n: "Milk", c: "Breakfast", s: "250ml", k: 150 }
    ],
    Lunch: [
      { n: "Rice", c: "Rice", s: "1.5 Cups", k: 300 },
      { n: "Masoor Dal", c: "Dal", s: "1 Bowl", k: 180 },
      { n: "Bandhakopi Tarkari", c: "Dry Veg", s: "1 Bowl", k: 110 }
    ],
    EveningSnacks: [
      { n: "Roasted Chana", c: "Snacks", s: "40g", k: 150 }
    ],
    Dinner: [
      { n: "Roti", c: "Bread", s: "3", k: 360 },
      { n: "Soybean Curry", c: "Soybean", s: "1 Bowl", k: 375 },
      { n: "Milk (Before Sleep)", c: "Breakfast", s: "250ml", k: 150 }
    ]
  },
  Wednesday: {
    Breakfast: [
      { n: "Oats", c: "Breakfast", s: "60g", k: 230 },
      { n: "Milk", c: "Breakfast", s: "250ml", k: 150 },
      { n: "Banana", c: "Fruits", s: "1", k: 105 }
    ],
    Lunch: [
      { n: "Rice", c: "Rice", s: "1.5 Cups", k: 300 },
      { n: "Chana Dal", c: "Dal", s: "1 Bowl", k: 220 },
      { n: "Mixed Vegetable Curry", c: "Dry Veg", s: "1 Bowl", k: 120 }
    ],
    EveningSnacks: [
      { n: "Roasted Chana", c: "Snacks", s: "40g", k: 150 }
    ],
    Dinner: [
      { n: "Roti", c: "Bread", s: "3", k: 360 },
      { n: "Soybean Curry", c: "Soybean", s: "1 Bowl", k: 365 },
      { n: "Milk (Before Sleep)", c: "Breakfast", s: "250ml", k: 150 }
    ]
  },
  Thursday: {
    Breakfast: [
      { n: "Daliya", c: "Breakfast", s: "1 Bowl", k: 280 },
      { n: "Banana", c: "Fruits", s: "1", k: 105 },
      { n: "Milk", c: "Breakfast", s: "250ml", k: 150 }
    ],
    Lunch: [
      { n: "Rice", c: "Rice", s: "1.5 Cups", k: 300 },
      { n: "Moong Dal", c: "Dal", s: "1 Bowl", k: 180 },
      { n: "Palak Sabji", c: "Dry Veg", s: "1 Bowl", k: 110 }
    ],
    EveningSnacks: [
      { n: "Roasted Chana", c: "Snacks", s: "40g", k: 150 }
    ],
    Dinner: [
      { n: "Roti", c: "Bread", s: "3", k: 360 },
      { n: "Soybean Curry", c: "Soybean", s: "1 Bowl", k: 415 },
      { n: "Milk (Before Sleep)", c: "Breakfast", s: "250ml", k: 150 }
    ]
  },
  Friday: {
    Breakfast: [
      { n: "Poha", c: "Breakfast", s: "1 Plate", k: 300 },
      { n: "Banana", c: "Fruits", s: "1 Medium", k: 105 },
      { n: "Milk", c: "Breakfast", s: "250ml", k: 150 }
    ],
    Lunch: [
      { n: "Rice", c: "Rice", s: "1.5 Cups", k: 300 },
      { n: "Dal", c: "Dal", s: "1 Bowl", k: 180 },
      { n: "Aloo Gobi", c: "Dry Veg", s: "1 Bowl", k: 150 }
    ],
    EveningSnacks: [
      { n: "Roasted Chana", c: "Snacks", s: "40g", k: 150 }
    ],
    Dinner: [
      { n: "Roti", c: "Bread", s: "3", k: 360 },
      { n: "Soybean Curry", c: "Soybean", s: "1 Bowl", k: 335 },
      { n: "Milk (Before Sleep)", c: "Breakfast", s: "250ml", k: 150 }
    ]
  },
  Saturday: {
    Breakfast: [
      { n: "Upma", c: "Breakfast", s: "1 Plate", k: 320 },
      { n: "Banana", c: "Fruits", s: "1", k: 105 },
      { n: "Milk", c: "Breakfast", s: "250ml", k: 150 }
    ],
    Lunch: [
      { n: "Khichdi", c: "Rice", s: "2 Bowls", k: 500 },
      { n: "Salad", c: "Salads", s: "1 Plate", k: 40 }
    ],
    EveningSnacks: [
      { n: "Roasted Chana", c: "Snacks", s: "40g", k: 150 }
    ],
    Dinner: [
      { n: "Roti", c: "Bread", s: "3", k: 360 },
      { n: "Soybean Curry", c: "Soybean", s: "1 Bowl", k: 425 },
      { n: "Milk (Before Sleep)", c: "Breakfast", s: "250ml", k: 150 }
    ]
  },
  Sunday: {
    Breakfast: [
      { n: "Oats", c: "Breakfast", s: "60g", k: 230 },
      { n: "Banana", c: "Fruits", s: "1", k: 105 },
      { n: "Milk", c: "Breakfast", s: "250ml", k: 150 }
    ],
    Lunch: [
      { n: "Rice", c: "Rice", s: "1.5 Cups", k: 300 },
      { n: "Dal", c: "Dal", s: "1 Bowl", k: 180 },
      { n: "Mixed Vegetable Curry", c: "Dry Veg", s: "1 Bowl", k: 120 }
    ],
    EveningSnacks: [
      { n: "Sprouts", c: "Snacks", s: "1 Bowl", k: 120 }
    ],
    Dinner: [
      { n: "Khichdi", c: "Rice", s: "1.5 Bowls", k: 450 },
      { n: "Curd", c: "Dairy", s: "1 Bowl", k: 150 },
      { n: "Milk (Before Sleep)", c: "Breakfast", s: "250ml", k: 150 }
    ]
  }
};

// Default 7-day weekday-specific diet plan mapping for Rishit (Aman's + Dietician Extra portion)
const defaultWeeklyScheduleRishit = JSON.parse(JSON.stringify(defaultWeeklyScheduleAman));
Object.keys(defaultWeeklyScheduleRishit).forEach(day => {
  const dayPlan = defaultWeeklyScheduleRishit[day];
  ["Breakfast", "Lunch", "EveningSnacks", "Dinner"].forEach(mealType => {
    dayPlan[mealType] = dayPlan[mealType].map(item => {
      // 1. rice: +0.5 Cup Every Lunch (total 2 Cups, k=400 instead of 300)
      if (item.n === "Rice") {
        return { n: "Rice", c: "Rice", s: "2 Cups", k: 400 };
      }
      // 2. roti: +1 Roti Every Dinner (total 4, k=480 instead of 360)
      if (item.n === "Roti") {
        return { n: "Roti", c: "Bread", s: "4", k: 480 };
      }
      // 3. roastedChana: +10g Daily (total 50g, k=190 instead of 150)
      if (item.n === "Roasted Chana") {
        return { n: "Roasted Chana", c: "Snacks", s: "50g", k: 190 };
      }
      // 4. soybeanCurry: +50g Soy Chunks Daily (add 170 kcal, total s="1 Bowl + 50g Soy Chunks")
      if (item.n === "Soybean Curry") {
        return { n: "Soybean Curry", c: "Soybean", s: "1 Bowl + 50g Soy Chunks", k: item.k + 170 };
      }
      return item;
    });
  });
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

// Automatic migration utility to update legacy schedules to dietician plan
function migrateDietDataIfNecessary(data, user) {
  const versionKey = "duogym_diet_version_dietician_v2";
  if (!localStorage.getItem(versionKey)) {
    const isAman = (user === "aman");
    data.profile.targetCalories = isAman ? 2200 : 2300;
    data.schedule = JSON.parse(JSON.stringify(isAman ? defaultWeeklyScheduleAman : defaultWeeklyScheduleRishit));
    return true;
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
      targetCalories: isAman ? 2200 : 2300
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

  // Set version flag so migration doesn't run again next time
  localStorage.setItem("duogym_diet_version_dietician_v2", "true");
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
  if (activePage !== "diet") return;
  if (!selectedDietDate) {
    selectedDietDate = selectedDate; // Sync with calendar date context
  }
  
  // Switch Sub-tabs content show/hide
  const panels = ["log", "schedule", "profile", "reports"];
  panels.forEach(p => {
    const el = document.getElementById(`diet-panel-${p}`);
    if (el) el.style.display = (p === activeDietTab) ? "block" : "none";
    
    const btn = document.getElementById(`diet-tab-btn-${p}`);
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
  document.getElementById("diet-date-text").textContent = formatDateLong(selectedDietDate);
  document.getElementById("diet-date-picker").value = selectedDietDate;
  
  const targetCals = data.profile.targetCalories || 2000;
  document.getElementById("diet-val-target").textContent = targetCals;
  
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
  document.getElementById("diet-val-consumed").textContent = consumedCals;
  
  const remainingCals = targetCals - consumedCals;
  const remainingLabel = document.getElementById("diet-val-remaining");
  const remainingStatus = document.getElementById("diet-status-remaining");
  
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
  const progressFill = document.getElementById("diet-progress-fill");
  if (progressFill) {
    progressFill.style.width = `${pct}%`;
    progressFill.style.background = (consumedCals > targetCals) ? "var(--danger)" : "var(--accent)";
  }

  // Macro progress totals
  document.getElementById("diet-protein-total").textContent = `${totalProtein} / 130g`;
  document.getElementById("diet-carbs-total").textContent = `${totalCarbs} / 250g`;
  document.getElementById("diet-fat-total").textContent = `${totalFat} / 70g`;

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
}

// Open/close add food bottom-sheet modal
function openAddFoodModal(mealType) {
  activeLoggingMeal = mealType;
  selectedDietCategory = ""; // Reset category filter
  
  // Set modal title depending on context (schedule vs log)
  const titleEl = document.getElementById("diet-modal-title-text");
  if (titleEl) {
    if (activeDietTab === "schedule") {
      const day = document.getElementById("diet-sched-day-select").value;
      titleEl.textContent = `Add to ${day}'s ${mealType}`;
    } else {
      titleEl.textContent = `Add to ${mealType}`;
    }
  }
  
  // Reset search input
  const searchInput = document.getElementById("diet-search-input");
  if (searchInput) searchInput.value = "";
  
  // Render category chips
  renderCategoryChips();
  
  // Reset search page
  dietSearchPage = 1;
  
  // Perform initial search
  onDietSearch();
  
  // Show modal
  const modal = document.getElementById("diet-food-modal");
  if (modal) modal.classList.add("active");
}

function closeAddFoodModal() {
  const modal = document.getElementById("diet-food-modal");
  if (modal) modal.classList.remove("active");
  activeLoggingMeal = "";
}

function showExerciseInfo(exerciseId) {
  const info = exerciseInstructions[exerciseId];
  if (!info) return;

  const modal = document.getElementById("exercise-info-modal");
  const title = document.getElementById("ex-modal-name");
  const stepsList = document.getElementById("ex-modal-steps");
  const tipsText = document.getElementById("ex-modal-tips");

  if (!modal || !title || !stepsList || !tipsText) return;

  title.textContent = info.name;

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
}

function closeExerciseInfoModal() {
  const modal = document.getElementById("exercise-info-modal");
  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }
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
  const container = document.getElementById("diet-cat-chips-container");
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
  const searchInput = document.getElementById("diet-search-input");
  const query = searchInput ? searchInput.value.toLowerCase() : "";
  const filterCat = selectedDietCategory;
  
  const sortSelect = document.getElementById("diet-sort-select");
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
  
  const listContainer = document.getElementById("diet-search-list");
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
  
  const pageInfoEl = document.getElementById("diet-page-info");
  if (pageInfoEl) pageInfoEl.textContent = `Page ${dietSearchPage} of ${totalPages}`;
  
  const showingInfoEl = document.getElementById("diet-showing-info");
  if (showingInfoEl) showingInfoEl.textContent = `(${total} items)`;
  
  const prevBtn = document.getElementById("diet-prev-btn");
  if (prevBtn) prevBtn.disabled = dietSearchPage <= 1;
  
  const nextBtn = document.getElementById("diet-next-btn");
  if (nextBtn) nextBtn.disabled = dietSearchPage >= totalPages;
  
  lucide.createIcons();
}

function changeDietPage(dir) {
  dietSearchPage += dir;
  onDietSearch();
}

// Add searched food selection to daily log or schedule
function addSearchedFood(foodName) {
  const food = dietFoods.find(f => f.n === foodName);
  if (!food) return;
  
  const mealType = activeLoggingMeal;
  if (!mealType) return;
  
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
  closeAddFoodModal();
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
  const panel = document.getElementById("stopwatch-overlay");
  if (!panel) return;
  const isHidden = panel.style.display === "none";
  panel.style.display = isHidden ? "flex" : "none";
  
  // Refresh icons inside the panel
  lucide.createIcons();
}

function updateStopwatchDisplay() {
  const display = document.getElementById("sw-display");
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
  const startBtn = document.getElementById("sw-start-btn");
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
  const startBtn = document.getElementById("sw-start-btn");
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
let activeTimers = {}; // { exerciseId: { intervalId, remainingSeconds, targetSeconds, state } }

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

function formatTimerTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function toggleInlineTimer(exerciseId, repsText) {
  if (selectedDate > dateToYYYYMMDD(new Date())) {
    alert("Cannot start timers for future dates.");
    return;
  }
  
  ensureDateRecord(currentUser, selectedDate);
  const record = fitnessData[currentUser].workouts[selectedDate];
  if (record.completedExercises.includes(exerciseId)) return;

  let timer = activeTimers[exerciseId];
  if (!timer) {
    const target = parseTargetSeconds(repsText);
    timer = {
      intervalId: null,
      remainingSeconds: target,
      targetSeconds: target,
      state: 'idle'
    };
    activeTimers[exerciseId] = timer;
  }

  // If starting this timer, pause any other running exercise timers first
  if (timer.state !== 'running') {
    Object.keys(activeTimers).forEach(id => {
      if (id !== exerciseId && activeTimers[id].state === 'running') {
        clearInterval(activeTimers[id].intervalId);
        activeTimers[id].intervalId = null;
        activeTimers[id].state = 'paused';
        
        const otherBtn = document.getElementById(`timer-btn-${id}`);
        const otherDisplay = document.getElementById(`timer-val-${id}`);
        if (otherBtn) otherBtn.innerHTML = `<i data-lucide="play" style="width: 14px; height: 14px;"></i>`;
        if (otherDisplay) otherDisplay.classList.remove("counting");
      }
    });
  }

  const btn = document.getElementById(`timer-btn-${exerciseId}`);
  const display = document.getElementById(`timer-val-${exerciseId}`);

  if (timer.state === 'running') {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
    timer.state = 'paused';
    if (btn) btn.innerHTML = `<i data-lucide="play" style="width: 14px; height: 14px;"></i>`;
    if (display) display.classList.remove("counting");
  } else {
    timer.state = 'running';
    if (btn) btn.innerHTML = `<i data-lucide="pause" style="width: 14px; height: 14px;"></i>`;
    if (display) display.classList.add("counting");
    
    timer.intervalId = setInterval(() => {
      timer.remainingSeconds--;
      
      const liveDisplay = document.getElementById(`timer-val-${exerciseId}`);
      const liveBtn = document.getElementById(`timer-btn-${exerciseId}`);

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
        if (!rec.completedExercises.includes(exerciseId)) {
          toggleExerciseCheck(exerciseId);
        }
        
        if (liveBtn) liveBtn.style.display = "none";
        if (liveDisplay) {
          liveDisplay.textContent = "DONE";
          liveDisplay.classList.remove("counting");
          liveDisplay.classList.add("completed");
        }
        
        delete activeTimers[exerciseId];
      }
    }, 1000);
  }
  
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

function clearAllRunningTimers() {
  Object.keys(activeTimers).forEach(id => {
    if (activeTimers[id].intervalId) {
      clearInterval(activeTimers[id].intervalId);
    }
  });
  activeTimers = {};
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

  // Detect standalone PWA mode
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  // Load last selected user preference (default to "aman")
  const savedUser = localStorage.getItem("duogym_selected_user") || "aman";

  // Draw initial page elements
  switchUser(savedUser);
  switchPage("today");

  // If running as an installed standalone app, lock the profile and hide user tabs to reduce distraction
  if (isStandalone) {
    const switcher = document.querySelector(".user-tabs");
    if (switcher) {
      switcher.style.display = "none";
    }
  }

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
