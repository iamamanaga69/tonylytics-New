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
const exerciseLibrary = [
  {
    id: "chest-press",
    name: "Chest Press Machine",
    muscles: ["Chest", "Shoulders", "Triceps"],
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop",
    description: "A machine-based exercise that targets your chest muscles. Great for beginners because the machine guides your movement.",
    steps: [
      "Sit on the machine and adjust the seat so handles are at chest level",
      "Grip the handles with both hands",
      "Push the handles forward until arms are almost straight",
      "Slowly bring handles back to starting position",
      "Repeat for the desired number of reps"
    ],
    mistakes: [
      "Locking your elbows completely",
      "Arching your back off the seat",
      "Using too much weight",
      "Moving too fast"
    ],
    breathing: "Breathe out when you push, breathe in when you return.",
    tips: [
      "Start with light weight to learn the movement",
      "Keep your back flat against the seat",
      "Control the weight on the way back"
    ],
    restTime: "60-90 seconds"
  },
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    muscles: ["Back", "Biceps"],
    image: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400&h=300&fit=crop",
    description: "Pulls a bar down toward your chest to work your back muscles. Simulates a pull-up movement but easier for beginners.",
    steps: [
      "Sit down and adjust the knee pad",
      "Grab the bar with hands wider than shoulder-width",
      "Pull the bar down to your upper chest",
      "Slowly let the bar go back up with control",
      "Keep your chest up throughout"
    ],
    mistakes: [
      "Pulling the bar behind your neck",
      "Leaning too far back",
      "Using momentum to swing the weight"
    ],
    breathing: "Breathe out as you pull down, breathe in as you release.",
    tips: [
      "Imagine pulling with your elbows, not your hands",
      "Keep your chest lifted",
      "Use a weight you can control"
    ],
    restTime: "60-90 seconds"
  },
  {
    id: "seated-cable-row",
    name: "Seated Cable Row",
    muscles: ["Back", "Biceps", "Shoulders"],
    image: "https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?w=400&h=300&fit=crop",
    description: "A seated rowing movement using a cable machine. Excellent for building a stronger back.",
    steps: [
      "Sit on the bench and place feet on the footrests",
      "Grab the handle and sit upright",
      "Pull the handle toward your stomach",
      "Squeeze your shoulder blades together",
      "Slowly release back to start"
    ],
    mistakes: [
      "Rounding your back",
      "Pulling with only your arms",
      "Leaning too far forward or backward"
    ],
    breathing: "Breathe out as you pull, breathe in as you release.",
    tips: [
      "Keep your back straight throughout",
      "Focus on squeezing your back muscles",
      "Don't use momentum"
    ],
    restTime: "60-90 seconds"
  },
  {
    id: "shoulder-press",
    name: "Shoulder Press Machine",
    muscles: ["Shoulders", "Triceps"],
    image: "https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=400&h=300&fit=crop",
    description: "A machine press that targets your shoulder muscles. Safer than free weights for beginners.",
    steps: [
      "Adjust the seat so handles are at shoulder height",
      "Sit with back firmly against the pad",
      "Grip handles and push upward",
      "Extend arms without locking elbows",
      "Lower back down slowly"
    ],
    mistakes: [
      "Arching your lower back",
      "Locking elbows at the top",
      "Shrugging shoulders up"
    ],
    breathing: "Breathe out as you press up, breathe in as you lower.",
    tips: [
      "Start light to learn proper form",
      "Keep core engaged",
      "Lower the weight slowly"
    ],
    restTime: "60-90 seconds"
  },
  {
    id: "bicep-curl",
    name: "Bicep Curl Machine",
    muscles: ["Biceps"],
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&h=300&fit=crop",
    description: "An isolation machine that targets your biceps. The machine ensures proper form.",
    steps: [
      "Sit on the machine and adjust the seat",
      "Place arms on the pad and grip handles",
      "Curl the handles up toward your shoulders",
      "Squeeze at the top briefly",
      "Lower slowly back down"
    ],
    mistakes: [
      "Swinging your body",
      "Lifting too heavy",
      "Not going through full range of motion"
    ],
    breathing: "Breathe out as you curl up, breathe in as you lower.",
    tips: [
      "Focus on slow, controlled movements",
      "Don't swing — let your biceps do the work",
      "Use a weight you can do 12 reps with"
    ],
    restTime: "60 seconds"
  },
  {
    id: "tricep-pushdown",
    name: "Tricep Pushdown",
    muscles: ["Triceps"],
    image: "https://images.unsplash.com/photo-1590487988256-9ed24133863e?w=400&h=300&fit=crop",
    description: "A cable exercise that isolates your triceps. You push a cable attachment downward.",
    steps: [
      "Stand facing the cable machine",
      "Grab the bar or rope attachment",
      "Keep elbows tucked at your sides",
      "Push the handle down until arms are straight",
      "Slowly let it come back up to chest level"
    ],
    mistakes: [
      "Flaring elbows out",
      "Using your body to push down",
      "Going too heavy"
    ],
    breathing: "Breathe out as you push down, breathe in as you release.",
    tips: [
      "Keep elbows pinned to your sides",
      "Stand with slight forward lean",
      "Control the movement both ways"
    ],
    restTime: "60 seconds"
  },
  {
    id: "incline-treadmill",
    name: "Incline Treadmill Walk",
    muscles: ["Legs", "Cardiovascular"],
    image: "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=400&h=300&fit=crop",
    description: "Walking on a treadmill at an incline. Great for heart health and burning calories without high impact.",
    steps: [
      "Step onto the treadmill and start at a slow speed",
      "Gradually increase the incline to 5-10%",
      "Walk at a comfortable pace (3-4 km/h)",
      "Keep your posture upright",
      "Hold on to handles only if needed for balance"
    ],
    mistakes: [
      "Holding handles too tightly",
      "Leaning forward too much",
      "Setting incline too high too soon"
    ],
    breathing: "Breathe naturally through your nose and mouth.",
    tips: [
      "Start with a lower incline and increase gradually",
      "Swing arms naturally for balance",
      "Watch your posture"
    ],
    restTime: "None — continuous"
  },
  {
    id: "cycling",
    name: "Cycling (Stationary Bike)",
    muscles: ["Legs", "Cardiovascular"],
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=300&fit=crop",
    description: "Pedaling on a stationary bike. Easy on the joints and great for cardio fitness.",
    steps: [
      "Adjust the seat height so your leg is slightly bent at the bottom of the pedal",
      "Sit on the bike and place feet on pedals",
      "Start pedaling at a comfortable pace",
      "Gradually increase resistance if comfortable",
      "Maintain a steady rhythm"
    ],
    mistakes: [
      "Seat too high or too low",
      "Gripping handlebars too tightly",
      "Hunching your back"
    ],
    breathing: "Breathe deeply and rhythmically throughout.",
    tips: [
      "Adjust the seat properly before starting",
      "Start with low resistance",
      "Keep a steady pace"
    ],
    restTime: "None — continuous"
  },
  {
    id: "hamstring-stretch",
    name: "Hamstring Stretch",
    muscles: ["Hamstrings"],
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop",
    description: "A simple stretch for the back of your thighs. Helps improve flexibility and prevent injury.",
    steps: [
      "Stand upright or sit on the floor",
      "Extend one leg straight in front of you",
      "Lean forward gently from your hips",
      "Reach toward your toes until you feel a stretch",
      "Hold for 30 seconds, then switch legs"
    ],
    mistakes: [
      "Bouncing while stretching",
      "Rounding your back excessively",
      "Pushing too hard into pain"
    ],
    breathing: "Breathe slowly and deeply while holding the stretch.",
    tips: [
      "Never force a stretch — go to mild discomfort only",
      "Hold each stretch for at least 30 seconds",
      "Do this after your workout when muscles are warm"
    ],
    restTime: "No rest needed"
  },
  {
    id: "quad-stretch",
    name: "Quad Stretch",
    muscles: ["Quadriceps"],
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop",
    description: "Stretches the front of your thigh. Important for leg flexibility and recovery.",
    steps: [
      "Stand on one leg (hold something for balance)",
      "Bend your other knee and grab your ankle behind you",
      "Pull your heel gently toward your buttock",
      "Keep your knees close together",
      "Hold for 30 seconds, then switch"
    ],
    mistakes: [
      "Pulling too hard on your ankle",
      "Leaning forward",
      "Twisting your knee"
    ],
    breathing: "Breathe deeply and relax into the stretch.",
    tips: [
      "Use a wall for balance",
      "Keep standing leg slightly bent",
      "Don't arch your back"
    ],
    restTime: "No rest needed"
  },
  {
    id: "shoulder-stretch",
    name: "Shoulder Stretch",
    muscles: ["Shoulders", "Upper Back"],
    image: "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=400&h=300&fit=crop",
    description: "A gentle stretch for your shoulder muscles. Helps with mobility and posture.",
    steps: [
      "Bring one arm across your chest",
      "Use the other hand to gently press it closer",
      "Hold for 30 seconds",
      "Switch arms and repeat"
    ],
    mistakes: [
      "Pressing too hard",
      "Shrugging your shoulders up",
      "Rotating your body"
    ],
    breathing: "Breathe normally and relax your shoulders.",
    tips: [
      "Keep shoulders down and relaxed",
      "Feel the stretch, not pain",
      "Do this daily for better posture"
    ],
    restTime: "No rest needed"
  },
  {
    id: "leg-press",
    name: "Leg Press",
    muscles: ["Quadriceps", "Hamstrings", "Glutes"],
    image: "https://images.unsplash.com/photo-1534368959876-26bf04f2c947?w=400&h=300&fit=crop",
    description: "A machine exercise where you push a weighted platform away with your legs. Safe and effective for building leg strength.",
    steps: [
      "Sit on the machine with back flat against the pad",
      "Place feet shoulder-width apart on the platform",
      "Release the safety handles",
      "Lower the platform by bending your knees to 90 degrees",
      "Push the platform back up without locking knees"
    ],
    mistakes: [
      "Locking your knees at the top",
      "Placing feet too high or too low",
      "Letting knees cave inward",
      "Lifting hips off the seat"
    ],
    breathing: "Breathe in as you lower, breathe out as you push up.",
    tips: [
      "Start with light weight",
      "Keep your back pressed against the pad",
      "Don't lock your knees"
    ],
    restTime: "60-90 seconds"
  },
  {
    id: "leg-extension",
    name: "Leg Extension",
    muscles: ["Quadriceps"],
    image: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&h=300&fit=crop",
    description: "An isolation machine exercise that targets the front of your thighs. You extend your legs against resistance.",
    steps: [
      "Sit on the machine and adjust the back pad",
      "Place your shins behind the padded bar",
      "Extend your legs until they are straight",
      "Hold briefly at the top",
      "Slowly lower back down"
    ],
    mistakes: [
      "Using too much weight",
      "Swinging the weight up",
      "Not controlling the lowering phase"
    ],
    breathing: "Breathe out as you extend, breathe in as you lower.",
    tips: [
      "Use a controlled tempo",
      "Squeeze your quads at the top",
      "Adjust the machine to fit your body"
    ],
    restTime: "60 seconds"
  },
  {
    id: "leg-curl",
    name: "Leg Curl",
    muscles: ["Hamstrings"],
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
    description: "A machine exercise targeting the back of your thighs. You curl your legs against resistance.",
    steps: [
      "Lie face down or sit on the leg curl machine",
      "Position the pad just above your heels",
      "Curl your legs up toward your buttocks",
      "Squeeze at the top",
      "Lower slowly back down"
    ],
    mistakes: [
      "Lifting your hips off the bench",
      "Using momentum",
      "Not going through full range of motion"
    ],
    breathing: "Breathe out as you curl, breathe in as you lower.",
    tips: [
      "Keep hips pressed against the bench",
      "Use smooth, controlled movements",
      "Start with lighter weight"
    ],
    restTime: "60 seconds"
  },
  {
    id: "calf-raise",
    name: "Standing Calf Raise",
    muscles: ["Calves"],
    image: "https://images.unsplash.com/photo-1571019613576-2b22c76fd955?w=400&h=300&fit=crop",
    description: "An exercise where you raise your heels to work your calf muscles. Can be done on a machine or a step.",
    steps: [
      "Stand on the calf raise machine or a step",
      "Place the balls of your feet on the edge",
      "Lower your heels below the platform",
      "Push up onto your toes as high as you can",
      "Hold briefly at the top, then lower slowly"
    ],
    mistakes: [
      "Bouncing at the bottom",
      "Not going through full range of motion",
      "Going too fast"
    ],
    breathing: "Breathe out as you raise up, breathe in as you lower.",
    tips: [
      "Go slow for better results",
      "Squeeze your calves at the top",
      "Use full range of motion"
    ],
    restTime: "45-60 seconds"
  },
  {
    id: "glute-bridge",
    name: "Glute Bridge",
    muscles: ["Glutes", "Hamstrings", "Core"],
    image: "https://images.unsplash.com/photo-1571019613531-f5f5e3b5e63d?w=400&h=300&fit=crop",
    description: "A floor exercise where you lift your hips to strengthen your glutes. No equipment needed.",
    steps: [
      "Lie on your back with knees bent and feet flat",
      "Place arms at your sides",
      "Push through your heels to lift your hips",
      "Squeeze your glutes at the top",
      "Lower slowly back to the ground"
    ],
    mistakes: [
      "Arching your lower back too much",
      "Pushing through toes instead of heels",
      "Not squeezing glutes at the top"
    ],
    breathing: "Breathe out as you lift, breathe in as you lower.",
    tips: [
      "Keep feet hip-width apart",
      "Drive through your heels",
      "Hold the top position for 1-2 seconds"
    ],
    restTime: "45-60 seconds"
  },
  {
    id: "plank",
    name: "Plank",
    muscles: ["Core", "Shoulders", "Back"],
    image: "https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400&h=300&fit=crop",
    description: "A bodyweight exercise where you hold a push-up-like position. Amazing for core strength.",
    steps: [
      "Start on the floor on your forearms and toes",
      "Keep your body in a straight line",
      "Engage your core muscles",
      "Hold the position without dropping your hips",
      "Aim for 20-30 seconds to start"
    ],
    mistakes: [
      "Letting hips sag down",
      "Raising hips too high",
      "Holding your breath",
      "Looking up (strain on neck)"
    ],
    breathing: "Breathe normally throughout — don't hold your breath.",
    tips: [
      "Start with shorter holds and build up",
      "Look at the floor to keep neck neutral",
      "Squeeze your glutes and abs"
    ],
    restTime: "30-60 seconds"
  },
  {
    id: "dead-bug",
    name: "Dead Bug",
    muscles: ["Core", "Hip Flexors"],
    image: "https://images.unsplash.com/photo-1518459031867-a89b944bffe4?w=400&h=300&fit=crop",
    description: "A floor exercise where you move opposite arms and legs while keeping your core stable. Great for beginners.",
    steps: [
      "Lie on your back with arms pointing up to the ceiling",
      "Raise your legs with knees bent at 90 degrees",
      "Slowly lower your right arm and left leg toward the floor",
      "Return to starting position",
      "Repeat with the opposite arm and leg"
    ],
    mistakes: [
      "Arching your lower back off the floor",
      "Moving too fast",
      "Not engaging your core"
    ],
    breathing: "Breathe out as you extend your limbs, breathe in as you return.",
    tips: [
      "Press your lower back into the floor",
      "Move slowly and with control",
      "Start with fewer reps and build up"
    ],
    restTime: "30-45 seconds"
  },
  {
    id: "brisk-walking",
    name: "Brisk Walking",
    muscles: ["Full Body", "Cardiovascular"],
    image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&h=300&fit=crop",
    description: "Walking at a fast, purposeful pace. One of the best exercises for overall health and recovery.",
    steps: [
      "Put on comfortable shoes",
      "Start walking at your normal pace",
      "Gradually increase speed until slightly breathless",
      "Swing your arms naturally",
      "Maintain good posture — head up, shoulders back"
    ],
    mistakes: [
      "Walking too slowly",
      "Looking down at phone",
      "Taking too short of steps"
    ],
    breathing: "Breathe naturally through nose and mouth.",
    tips: [
      "Aim for 5-6 km/h pace",
      "Walk outdoors for fresh air",
      "Use it as active recovery"
    ],
    restTime: "None — continuous"
  },
  {
    id: "full-body-stretching",
    name: "Full Body Stretching",
    muscles: ["Full Body"],
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop",
    description: "A series of stretches for your whole body. Essential for flexibility, recovery, and preventing injury.",
    steps: [
      "Start with neck rolls — 10 each direction",
      "Shoulder rolls — 10 forward and backward",
      "Arm across chest stretch — 30 sec each",
      "Standing quad stretch — 30 sec each leg",
      "Hamstring stretch — 30 sec each leg",
      "Seated spinal twist — 30 sec each side",
      "Child's pose — hold for 30-60 seconds"
    ],
    mistakes: [
      "Bouncing while stretching",
      "Skipping stretches",
      "Stretching cold muscles too aggressively"
    ],
    breathing: "Breathe deeply and slowly throughout.",
    tips: [
      "Stretch after every workout",
      "Never stretch to the point of pain",
      "Hold each stretch for at least 30 seconds"
    ],
    restTime: "No rest needed"
  },
  {
    id: "crunches",
    name: "Crunches",
    muscles: ["Abs", "Core"],
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
    description: "A basic abdominal exercise done lying on your back. Targets the front of your core.",
    steps: [
      "Lie on your back with knees bent and feet flat",
      "Place hands behind your head or across your chest",
      "Curl your shoulders off the floor using your abs",
      "Hold briefly at the top",
      "Lower back down slowly"
    ],
    mistakes: [
      "Pulling on your neck",
      "Using momentum",
      "Coming up too high",
      "Not controlling the lowering"
    ],
    breathing: "Breathe out as you crunch up, breathe in as you lower.",
    tips: [
      "Focus on using your abs, not your neck",
      "Keep a small gap between chin and chest",
      "Quality over quantity"
    ],
    restTime: "30-45 seconds"
  }
];

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

// Switch between page panels (Summary, Today, Calendar, Weights, Library, Notes)
function switchPage(pageId) {
  activePage = pageId;

  // Toggle active styling on navigation buttons
  const navIds = ["summary", "today", "calendar", "weights", "library", "notes"];
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
  } else if (activePage === "calendar") {
    renderCalendar();
  } else if (activePage === "weights") {
    renderWeightTracker();
  } else if (activePage === "library") {
    renderExerciseLibrary();
  } else if (activePage === "notes") {
    renderNotes();
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

    // Right info link icon
    const infoLink = document.createElement("button");
    infoLink.className = "btn-info-link";
    infoLink.title = "View Exercise Instructions";
    infoLink.onclick = (e) => {
      e.stopPropagation(); // Stop checkbox toggle trigger
      openExerciseModal(ex.exerciseId);
    };
    infoLink.innerHTML = `<i data-lucide="info"></i>`;

    row.appendChild(left);
    row.appendChild(infoLink);

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


/* ── RENDER PAGE 2: GYM CALENDAR ──────────────────────────── */
function renderCalendar() {
  const calendarGrid = document.getElementById("calendar-months-grid");
  calendarGrid.innerHTML = "";

  // Parse subscription boundaries to obtain calendar months
  const start = new Date(START_DATE_STR);
  const end = new Date(END_DATE_STR);

  // We loop month-by-month from June 2026 to June 2027
  let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);

  while (currentMonth <= new Date(end.getFullYear(), end.getMonth(), 1)) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Create Month card card
    const monthCard = document.createElement("div");
    monthCard.className = "month-card";

    // Header title (e.g. "August 2026")
    const title = document.createElement("div");
    title.className = "month-title";
    title.textContent = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    
    // Calculate stats for this month
    let monthCompleted = 0;
    let monthMissed = 0;
    const todayStr = dateToYYYYMMDD(new Date());
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (isWithinSubscription(dStr) && getWeekdayName(dStr) !== "Sunday") {
        ensureDateRecord(currentUser, dStr);
        const rec = fitnessData[currentUser].workouts[dStr];
        const completedCount = (rec && rec.completedExercises) ? rec.completedExercises.length : 0;
        if (completedCount > 0) {
          monthCompleted++;
        } else {
          if (dStr < todayStr) {
            monthMissed++;
          }
        }
      }
    }

    const monthTotal = monthCompleted + monthMissed;
    const monthPercent = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0;

    // Monthly weight change
    const lastDay = new Date(year, month + 1, 0);
    const lastDayStr = dateToYYYYMMDD(lastDay > new Date() ? new Date() : lastDay);
    const weights = fitnessData[currentUser].weights || {};
    const loggedDates = Object.keys(weights).sort();
    let currMonthWeight = STARTING_WEIGHTS[currentUser];
    for (const dStr of loggedDates) {
      if (dStr <= lastDayStr) {
        currMonthWeight = weights[dStr];
      }
    }

    const prevLastDay = new Date(year, month, 0);
    let prevMonthWeight = STARTING_WEIGHTS[currentUser];
    if (prevLastDay >= new Date(START_DATE_STR)) {
      const prevLastDayStr = dateToYYYYMMDD(prevLastDay);
      for (const dStr of loggedDates) {
        if (dStr <= prevLastDayStr) {
          prevMonthWeight = weights[dStr];
        }
      }
    }
    const weightDiff = currMonthWeight - prevMonthWeight;
    const weightDiffStr = weightDiff === 0 ? "0.0 kg" : (weightDiff > 0 ? `+${weightDiff.toFixed(1)} kg` : `${weightDiff.toFixed(1)} kg`);

    // Create stats sub row
    const statsSub = document.createElement("div");
    statsSub.style.fontSize = "10px";
    statsSub.style.fontWeight = "500";
    statsSub.style.color = "var(--text-sub)";
    statsSub.style.marginTop = "6px";
    statsSub.style.display = "flex";
    statsSub.style.justifyContent = "space-between";
    statsSub.style.padding = "0 4px";
    statsSub.innerHTML = `
      <span>Done: ${monthCompleted} (${monthPercent}%)</span>
      <span style="color: ${weightDiff < 0 ? "var(--success)" : (weightDiff > 0 ? "#ef4444" : "var(--text-muted)")};">${weightDiffStr}</span>
    `;
    title.appendChild(statsSub);
    monthCard.appendChild(title);

    // Weekdays row (Mon-Sun structure)
    const weekdaysRow = document.createElement("div");
    weekdaysRow.className = "weekdays-header";
    const daysArr = ["M", "T", "W", "T", "F", "S", "S"];
    daysArr.forEach(d => {
      const span = document.createElement("span");
      span.textContent = d;
      weekdaysRow.appendChild(span);
    });
    monthCard.appendChild(weekdaysRow);

    // Days grid
    const daysGrid = document.createElement("div");
    daysGrid.className = "days-grid";

    // Calculate empty padding cells before 1st of month
    let firstDayIndex = new Date(year, month, 1).getDay();
    let padCount = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // shift so Monday is 0

    for (let i = 0; i < padCount; i++) {
      const pad = document.createElement("div");
      pad.className = "day-cell empty-pad";
      daysGrid.appendChild(pad);
    }

    // Render calendar days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayCell = document.createElement("div");
      dayCell.className = "day-cell";
      
      const numSpan = document.createElement("span");
      numSpan.className = "day-num";
      numSpan.textContent = day;
      dayCell.appendChild(numSpan);

      const statusSpan = document.createElement("span");
      statusSpan.className = "day-status-indicator";

      // Apply bounds classes and logic
      if (!isWithinSubscription(dateStr)) {
        dayCell.classList.add("out-of-bounds");
        statusSpan.textContent = "-";
      } else {
        ensureDateRecord(currentUser, dateStr);
        const record = fitnessData[currentUser].workouts[dateStr];
        const isSunday = getWeekdayName(dateStr) === "Sunday";

        const hasCompletedExercises = record && record.completedExercises.length > 0;
        
        if (hasCompletedExercises) {
          dayCell.classList.add("cell-completed");
          statusSpan.textContent = "✓";
        } else if (isSunday) {
          dayCell.classList.add("cell-rest");
          statusSpan.textContent = "R";
        } else {
          dayCell.classList.add("cell-missed");
          statusSpan.textContent = "○";
        }

        // Highlight real-world current date if matches
        const realTodayStr = dateToYYYYMMDD(new Date());
        if (dateStr === realTodayStr) {
          dayCell.classList.add("cell-today");
        }

        // Click handler opens review modal
        dayCell.onclick = () => openDayModal(dateStr);
      }

      dayCell.appendChild(statusSpan);
      daysGrid.appendChild(dayCell);
    }

    monthCard.appendChild(daysGrid);
    calendarGrid.appendChild(monthCard);

    // Increment month
    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }
}


/* ── RENDER PAGE 3: WEIGHT TRACKER ────────────────────────── */
function renderWeightTracker() {
  const weights = fitnessData[currentUser].weights || {};
  const startingWeight = STARTING_WEIGHTS[currentUser];
  const goalWeight = fitnessData[currentUser].goalWeight || 80.0;
  
  // Sort dates chronologically ascending
  const sortedDates = Object.keys(weights).sort();
  
  // Find current/latest logged weight
  let latestWeight = startingWeight;
  let latestDateText = "15 June 2026";
  let latestDateStr = START_DATE_STR;
  
  if (sortedDates.length > 0) {
    latestDateStr = sortedDates[sortedDates.length - 1];
    latestWeight = weights[latestDateStr];
    latestDateText = formatDateLong(latestDateStr);
  }

  // Weight Lost
  const lost = startingWeight - latestWeight;
  const lostStr = lost === 0 ? "0.0 kg" : (lost > 0 ? `${lost.toFixed(1)} kg` : `+${Math.abs(lost).toFixed(1)} kg`);
  let lostTrend = "Overall lost";
  let lostClass = "";
  if (lost > 0) {
    lostClass = "text-success";
  } else if (lost < 0) {
    lostClass = "text-danger";
    lostTrend = "Overall gained";
  }

  // Remaining weight to Goal
  const remaining = latestWeight - goalWeight;
  let remainingText = "0.0 kg";
  let remainingTrend = "Remaining";
  let remainingClass = "";
  
  if (remaining > 0) {
    remainingText = `${remaining.toFixed(1)} kg`;
  } else {
    remainingText = "0.0 kg";
    remainingTrend = "Goal Achieved! 🎉";
    remainingClass = "text-success";
  }

  // Update Stats Cards
  document.getElementById("weight-stat-start").textContent = `${startingWeight} kg`;
  document.getElementById("weight-stat-latest").textContent = `${latestWeight} kg`;
  document.getElementById("weight-stat-latest-date").textContent = latestDateText;
  
  document.getElementById("weight-stat-goal").textContent = `${goalWeight} kg`;
  
  const lostEl = document.getElementById("weight-stat-lost");
  lostEl.textContent = lostStr;
  lostEl.className = `stat-val ${lostClass}`;
  document.getElementById("weight-stat-lost-trend").textContent = lostTrend;

  const remainingEl = document.getElementById("weight-stat-remaining");
  remainingEl.textContent = remainingText;
  remainingEl.className = `stat-val ${remainingClass}`;
  document.getElementById("weight-stat-remaining-trend").textContent = remainingTrend;

  // Default input dates to today if within bounds, else baseline
  const todayStr = dateToYYYYMMDD(new Date());
  const defaultDate = isWithinSubscription(todayStr) ? todayStr : START_DATE_STR;
  
  document.getElementById("weight-input-date").value = defaultDate;
  document.getElementById("weight-input-val").value = "";
  
  document.getElementById("measure-input-date").value = defaultDate;
  document.getElementById("photo-input-date").value = defaultDate;

  // Render Weight History Table body (dates descending)
  const tbody = document.getElementById("weight-history-tbody");
  tbody.innerHTML = "";

  const descDates = [...sortedDates].reverse();

  if (descDates.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">No weight entries logged yet.</td></tr>`;
  } else {
    descDates.forEach(dateStr => {
      const weightVal = weights[dateStr];
      const tr = document.createElement("tr");

      const tdDate = document.createElement("td");
      tdDate.textContent = formatDateLong(dateStr);

      const tdWeight = document.createElement("td");
      tdWeight.style.fontWeight = "600";
      tdWeight.textContent = `${weightVal} kg`;

      const tdAction = document.createElement("td");
      
      if (dateStr === START_DATE_STR) {
        tdAction.innerHTML = `<span style="font-size: 11px; color:var(--text-muted);">Baseline</span>`;
      } else {
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "btn btn-danger-subtle btn-sm";
        delBtn.innerHTML = `<i data-lucide="trash-2" style="width:13px;height:13px;"></i> Delete`;
        delBtn.onclick = () => deleteWeightEntry(dateStr);
        tdAction.appendChild(delBtn);
      }

      tr.appendChild(tdDate);
      tr.appendChild(tdWeight);
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
  }

  // Render Monthly Weight Summary card
  renderMonthlyWeightSummary();

  // Render Measurements History
  renderMeasurements();

  // Render Progress Photos Gallery dropdown and gallery
  updatePhotoGalleryDropdown();

  lucide.createIcons();
}

// Render Monthly Weight Summary inside card container
function renderMonthlyWeightSummary() {
  const container = document.getElementById("weight-monthly-summary-container");
  container.innerHTML = "";

  const monthlyChanges = calculateMonthlyWeightChanges(currentUser);
  
  if (monthlyChanges.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:var(--text-muted); font-size:12px;">No summary data.</div>`;
    return;
  }

  monthlyChanges.forEach(item => {
    const pill = document.createElement("div");
    pill.style.background = "rgba(255, 255, 255, 0.02)";
    pill.style.border = "1px solid var(--border-color)";
    pill.style.borderRadius = "var(--radius-sm)";
    pill.style.padding = "8px 12px";
    pill.style.display = "flex";
    pill.style.flexDirection = "column";
    pill.style.alignItems = "center";
    pill.style.gap = "4px";

    const label = document.createElement("span");
    label.style.fontSize = "11px";
    label.style.color = "var(--text-sub)";
    label.style.fontWeight = "600";
    label.textContent = item.label;

    const val = document.createElement("span");
    val.style.fontSize = "13px";
    val.style.fontWeight = "700";
    
    if (item.change === 0) {
      val.textContent = "0.0 kg";
      val.style.color = "var(--text-muted)";
    } else if (item.change < 0) {
      val.textContent = `${item.change.toFixed(1)} kg`;
      val.style.color = "var(--success)";
    } else {
      val.textContent = `+${item.change.toFixed(1)} kg`;
      val.style.color = "#ef4444";
    }

    pill.appendChild(label);
    pill.appendChild(val);
    container.appendChild(pill);
  });
}

// Log a new weight entry
function logNewWeight(event) {
  event.preventDefault();
  const weight = parseFloat(document.getElementById("weight-input-val").value);
  const dateStr = document.getElementById("weight-input-date").value;

  if (dateStr > dateToYYYYMMDD(new Date())) {
    alert("Cannot log weight for future dates.");
    return;
  }
  if (!isWithinSubscription(dateStr)) {
    alert(`Please select a date within the subscription period: ${formatDateLong(START_DATE_STR)} to ${formatDateLong(END_DATE_STR)}`);
    return;
  }
  if (isNaN(weight) || weight <= 0 || weight > 300) {
    alert("Please enter a valid weight numerical value (0 to 300 kg).");
    return;
  }

  if (!fitnessData[currentUser].weights) {
    fitnessData[currentUser].weights = {};
  }

  // Prevent duplicate logs confirmation
  if (fitnessData[currentUser].weights[dateStr] !== undefined) {
    if (!confirm(`A weight entry (${fitnessData[currentUser].weights[dateStr]} kg) already exists for ${formatDateLong(dateStr)}. Do you want to overwrite it?`)) {
      return;
    }
  }

  fitnessData[currentUser].weights[dateStr] = weight;

  saveData();
  renderWeightTracker();
  if (activePage === "summary") renderSummary();
}

// Delete custom weight entry
function deleteWeightEntry(dateStr) {
  if (dateStr === START_DATE_STR) {
    alert("Cannot delete the baseline starting weight.");
    return;
  }
  if (confirm(`Are you sure you want to delete the weight entry for ${formatDateLong(dateStr)}?`)) {
    delete fitnessData[currentUser].weights[dateStr];
    saveData();
    renderWeightTracker();
    if (activePage === "summary") renderSummary();
  }
}

// Render Measurements table
function renderMeasurements() {
  const measurements = fitnessData[currentUser].measurements || {};
  const tbody = document.getElementById("measurements-history-tbody");
  tbody.innerHTML = "";

  const sortedDates = Object.keys(measurements).sort().reverse();

  if (sortedDates.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No measurements logged yet.</td></tr>`;
  } else {
    sortedDates.forEach(dateStr => {
      const entry = measurements[dateStr];
      const tr = document.createElement("tr");

      const tdDate = document.createElement("td");
      tdDate.textContent = formatDateLong(dateStr);

      const tdChest = document.createElement("td");
      tdChest.textContent = entry.chest ? `${entry.chest} cm` : "--";

      const tdWaist = document.createElement("td");
      tdWaist.textContent = entry.waist ? `${entry.waist} cm` : "--";

      const tdArms = document.createElement("td");
      tdArms.textContent = entry.arms ? `${entry.arms} cm` : "--";

      const tdThighs = document.createElement("td");
      tdThighs.textContent = entry.thighs ? `${entry.thighs} cm` : "--";

      const tdAction = document.createElement("td");
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn btn-danger-subtle btn-sm";
      delBtn.innerHTML = `<i data-lucide="trash-2" style="width:13px;height:13px;"></i> Delete`;
      delBtn.onclick = () => deleteMeasurement(dateStr);
      tdAction.appendChild(delBtn);

      tr.appendChild(tdDate);
      tr.appendChild(tdChest);
      tr.appendChild(tdWaist);
      tr.appendChild(tdArms);
      tr.appendChild(tdThighs);
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
  }
}

// Log new measurements
function logNewMeasurements(event) {
  event.preventDefault();
  const dateStr = document.getElementById("measure-input-date").value;
  const chest = parseFloat(document.getElementById("measure-input-chest").value);
  const waist = parseFloat(document.getElementById("measure-input-waist").value);
  const arms = parseFloat(document.getElementById("measure-input-arms").value);
  const thighs = parseFloat(document.getElementById("measure-input-thighs").value);

  if (dateStr > dateToYYYYMMDD(new Date())) {
    alert("Cannot log measurements for future dates.");
    return;
  }
  if (!isWithinSubscription(dateStr)) {
    alert("Date must be within subscription period.");
    return;
  }
  if (isNaN(chest) || chest <= 0 || isNaN(waist) || waist <= 0 || isNaN(arms) || arms <= 0 || isNaN(thighs) || thighs <= 0) {
    alert("Please enter valid positive numbers for all measurement fields.");
    return;
  }

  if (!fitnessData[currentUser].measurements) {
    fitnessData[currentUser].measurements = {};
  }

  fitnessData[currentUser].measurements[dateStr] = { chest, waist, arms, thighs };

  saveData();
  renderWeightTracker();

  // Reset input fields
  document.getElementById("measure-input-chest").value = "";
  document.getElementById("measure-input-waist").value = "";
  document.getElementById("measure-input-arms").value = "";
  document.getElementById("measure-input-thighs").value = "";
}

// Delete measurement entry
function deleteMeasurement(dateStr) {
  if (confirm(`Are you sure you want to delete measurements for ${formatDateLong(dateStr)}?`)) {
    delete fitnessData[currentUser].measurements[dateStr];
    saveData();
    renderWeightTracker();
  }
}

// Compress image via Canvas to avoid filling up localStorage
function compressImage(file, maxWidth, maxHeight, callback) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      
      // Compress as JPEG (0.6 quality gives ~10-15KB)
      const base64 = canvas.toDataURL("image/jpeg", 0.6);
      callback(base64);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Save progress photos from form submission
function saveProgressPhotos(event) {
  event.preventDefault();
  const dateStr = document.getElementById("photo-input-date").value;

  if (dateStr > dateToYYYYMMDD(new Date())) {
    alert("Cannot log photos for future dates.");
    return;
  }
  if (!isWithinSubscription(dateStr)) {
    alert("Date must be within subscription period.");
    return;
  }

  const frontFile = document.getElementById("photo-input-front").files[0];
  const sideFile = document.getElementById("photo-input-side").files[0];

  if (!frontFile && !sideFile) {
    alert("Please select at least one photo (Front or Side) to upload.");
    return;
  }

  let frontBase64 = null;
  let sideBase64 = null;

  const handleSave = () => {
    if (!fitnessData[currentUser].photos) {
      fitnessData[currentUser].photos = {};
    }

    const existing = fitnessData[currentUser].photos[dateStr] || {};

    fitnessData[currentUser].photos[dateStr] = {
      front: frontBase64 || existing.front || null,
      side: sideBase64 || existing.side || null
    };

    saveData();
    renderWeightTracker();

    // Clear file inputs
    document.getElementById("photo-input-front").value = "";
    document.getElementById("photo-input-side").value = "";
    
    // Set dropdown to new date automatically
    const select = document.getElementById("gallery-date-select");
    if (select) {
      select.value = dateStr;
      loadGalleryPhotos(dateStr);
    }
  };

  // Resize and compress sequentially
  if (frontFile && sideFile) {
    compressImage(frontFile, 400, 400, (b64Front) => {
      frontBase64 = b64Front;
      compressImage(sideFile, 400, 400, (b64Side) => {
        sideBase64 = b64Side;
        handleSave();
      });
    });
  } else if (frontFile) {
    compressImage(frontFile, 400, 400, (b64Front) => {
      frontBase64 = b64Front;
      handleSave();
    });
  } else if (sideFile) {
    compressImage(sideFile, 400, 400, (b64Side) => {
      sideBase64 = b64Side;
      handleSave();
    });
  }
}

// Populates dates for progress photos gallery dropdown
function updatePhotoGalleryDropdown() {
  const select = document.getElementById("gallery-date-select");
  if (!select) return;

  const photos = fitnessData[currentUser].photos || {};
  const dates = Object.keys(photos).sort().reverse();
  
  const savedVal = select.value;
  select.innerHTML = "";

  if (dates.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No entries";
    select.appendChild(opt);
    loadGalleryPhotos("");
    return;
  }

  dates.forEach(dStr => {
    const opt = document.createElement("option");
    opt.value = dStr;
    opt.textContent = formatDateLong(dStr);
    select.appendChild(opt);
  });

  // Restore previous selection if still valid, else default to latest date
  if (dates.includes(savedVal)) {
    select.value = savedVal;
  } else {
    select.value = dates[0];
  }
  
  loadGalleryPhotos(select.value);
}

// Load active photos in gallery from selected date
function loadGalleryPhotos(dateStr) {
  const frontImg = document.getElementById("gallery-front-img");
  const frontPlace = document.getElementById("gallery-front-placeholder");
  const sideImg = document.getElementById("gallery-side-img");
  const sidePlace = document.getElementById("gallery-side-placeholder");
  const delBtn = document.getElementById("delete-photos-btn");

  if (!dateStr) {
    frontImg.style.display = "none";
    frontPlace.style.display = "inline";
    sideImg.style.display = "none";
    sidePlace.style.display = "inline";
    if (delBtn) delBtn.style.display = "none";
    return;
  }

  const entry = (fitnessData[currentUser].photos || {})[dateStr];
  
  if (entry && entry.front) {
    frontImg.src = entry.front;
    frontImg.style.display = "inline";
    frontPlace.style.display = "none";
  } else {
    frontImg.style.display = "none";
    frontPlace.style.display = "inline";
  }

  if (entry && entry.side) {
    sideImg.src = entry.side;
    sideImg.style.display = "inline";
    sidePlace.style.display = "none";
  } else {
    sideImg.style.display = "none";
    sidePlace.style.display = "inline";
  }

  if (delBtn) {
    delBtn.style.display = "inline-block";
  }
}

// Delete photo gallery entry
function deleteCurrentPhotos() {
  const select = document.getElementById("gallery-date-select");
  if (!select) return;
  const dateStr = select.value;
  if (!dateStr) return;

  if (confirm(`Are you sure you want to delete the progress photo entry for ${formatDateLong(dateStr)}?`)) {
    delete fitnessData[currentUser].photos[dateStr];
    saveData();
    renderWeightTracker();
  }
}


/* ── RENDER PAGE 4: EXERCISE LIBRARY ──────────────────────── */
function renderExerciseLibrary() {
  filterLibrary();
}

// Filter and render exercise cards inside library
function filterLibrary() {
  const query = document.getElementById("library-search-input").value.toLowerCase().trim();
  const grid = document.getElementById("library-cards-grid");
  grid.innerHTML = "";

  const filtered = exerciseLibrary.filter(ex => {
    // 1. Muscle filter match
    if (activeLibraryFilter !== "all") {
      const hasMuscle = ex.muscles.some(m => m.toLowerCase() === activeLibraryFilter.toLowerCase());
      if (!hasMuscle) return false;
    }
    // 2. Search query match
    if (query !== "") {
      const nameMatch = ex.name.toLowerCase().includes(query);
      const muscleMatch = ex.muscles.some(m => m.toLowerCase().includes(query));
      return nameMatch || muscleMatch;
    }
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:var(--text-muted);">No exercises found matching your search.</div>`;
    return;
  }

  filtered.forEach(ex => {
    const card = document.createElement("div");
    card.className = "exercise-card";
    card.onclick = () => openExerciseModal(ex.id);

    const img = document.createElement("img");
    img.src = ex.image;
    img.alt = ex.name;
    img.className = "exercise-card-image";
    img.loading = "lazy";

    const content = document.createElement("div");
    content.className = "exercise-card-content";

    const title = document.createElement("h4");
    title.className = "exercise-card-title";
    title.textContent = ex.name;

    const tags = document.createElement("div");
    tags.className = "muscle-tags";
    ex.muscles.forEach(m => {
      const tag = document.createElement("span");
      tag.className = "muscle-tag";
      tag.textContent = m;
      tags.appendChild(tag);
    });

    content.appendChild(title);
    content.appendChild(tags);
    card.appendChild(img);
    card.appendChild(content);

    grid.appendChild(card);
  });
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
   9. DETAIL POPUP DIALOGS (MODALS)
   ============================================================ */

/* ── EXERCISE INSTRUCTIONS MODAL ────────────────────────── */
function openExerciseModal(exerciseId) {
  const exercise = exerciseLibrary.find(e => e.id === exerciseId);
  if (!exercise) return;

  // Calculate history of completion for this exercise
  const completionDates = [];
  const workouts = fitnessData[currentUser].workouts || {};
  for (const dateStr in workouts) {
    const rec = workouts[dateStr];
    if (rec.completedExercises && rec.completedExercises.includes(exerciseId)) {
      completionDates.push(dateStr);
    }
  }
  completionDates.sort(); // Sort chronological ascending

  const totalCompletedCount = completionDates.length;
  const formattedDates = completionDates.map(d => {
    const [y, m, dNum] = d.split("-").map(Number);
    const dateObj = new Date(y, m - 1, dNum);
    return dateObj.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  });

  const modalBody = document.getElementById("modal-exercise-body");
  modalBody.innerHTML = `
    <img src="${exercise.image}" alt="${exercise.name}" class="modal-image">
    <div class="modal-padding">
      <div class="modal-title-box">
        <h3>${exercise.name}</h3>
        <div class="muscle-tags" style="margin-top:8px;">
          ${exercise.muscles.map(m => `<span class="muscle-tag">${m}</span>`).join("")}
        </div>
      </div>

      <p class="modal-desc">${exercise.description}</p>

      <div class="modal-section">
        <h4 class="modal-section-title">Step-by-Step Instructions</h4>
        <ol class="modal-list">
          ${exercise.steps.map(s => `<li>${s}</li>`).join("")}
        </ol>
      </div>

      <div class="modal-section">
        <h4 class="modal-section-title">Common Mistakes to Avoid</h4>
        <ul class="modal-list" style="list-style-type: disc;">
          ${exercise.mistakes.map(m => `<li>${m}</li>`).join("")}
        </ul>
      </div>

      <div class="modal-section">
        <h4 class="modal-section-title">Breathing Technique</h4>
        <p class="modal-text">${exercise.breathing}</p>
      </div>

      <div class="modal-section">
        <h4 class="modal-section-title">Safety & Tips</h4>
        <ul class="modal-list" style="list-style-type: disc;">
          ${exercise.tips.map(t => `<li>${t}</li>`).join("")}
        </ul>
      </div>

      <div class="modal-section">
        <h4 class="modal-section-title">Recommended Rest Period</h4>
        <p class="modal-text">${exercise.restTime}</p>
      </div>

      <div class="modal-section" style="margin-bottom:0; border-top: 1px solid var(--border-color); padding-top:16px;">
        <h4 class="modal-section-title">Personal Exercise History</h4>
        <p class="modal-text">Total Completed: <strong>${totalCompletedCount} times</strong></p>
        ${totalCompletedCount > 0 ? `
          <div style="max-height: 120px; overflow-y: auto; background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-top: 8px; font-size: 12px;">
            <ul style="list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 0;">
              ${formattedDates.map(fd => `<li style="display: flex; align-items: center; gap: 4px; color: var(--text-main);"><span style="color: var(--accent);">✓</span> ${fd}</li>`).join("")}
            </ul>
          </div>
        ` : `
          <p class="modal-text" style="color: var(--text-muted); font-style: italic; margin-top: 4px;">You haven't completed this exercise yet.</p>
        `}
      </div>
    </div>
  `;

  document.getElementById("exercise-modal").classList.add("active");
}

function closeExerciseModal(event) {
  document.getElementById("exercise-modal").classList.remove("active");
}

/* ── CALENDAR DAY HISTORY MODAL ──────────────────────────── */
function openDayModal(dateStr) {
  ensureDateRecord(currentUser, dateStr);
  const record = fitnessData[currentUser].workouts[dateStr];
  const workout = getWorkoutForDate(dateStr);
  const isFutureDate = dateStr > dateToYYYYMMDD(new Date());

  const modalBody = document.getElementById("modal-day-body");
  modalBody.innerHTML = `
    <div class="modal-padding">
      <div class="c-modal-header">
        <span class="c-modal-date">${formatDateLong(dateStr)}</span>
        <h3 class="c-modal-title">${workout.type}</h3>
        <p class="c-modal-meta">Focus: ${workout.focus}</p>
      </div>

      <div class="workout-progress-box" style="margin-bottom:20px;">
        <div class="progress-info">
          <span class="progress-title">Completion Percentage</span>
          <span id="c-modal-percent" class="progress-val">${record.completionPercentage}%</span>
        </div>
        <div class="progress-bar-bg">
          <div id="c-modal-progress-fill" class="progress-bar-fill" style="width: ${record.completionPercentage}%"></div>
        </div>
        <p id="c-modal-count-text" class="progress-count-text">
          Completed: ${record.completedExercises.length} of ${workout.exercises.length} exercises
        </p>
      </div>

      <h4 class="modal-section-title" style="margin-bottom:10px;">Exercises Toggled</h4>
      <div class="c-modal-checklist">
        ${workout.exercises.map(ex => {
          const isChecked = record.completedExercises.includes(ex.exerciseId);
          return `
            <div class="c-modal-chk-row ${isChecked ? "checked" : ""}" ${isFutureDate ? `style="opacity:0.6; cursor:not-allowed;" onclick="alert('Cannot log workouts for future dates.')"` : `onclick="toggleModalExercise('${dateStr}', '${ex.exerciseId}')"`}>
              <div class="custom-checkbox-wrapper">
                <input type="checkbox" class="custom-checkbox-input" ${isChecked ? "checked" : ""} ${isFutureDate ? "disabled" : ""}>
                <div class="custom-checkbox-box"></div>
              </div>
              <div class="checklist-label">
                <span class="ex-name" style="font-size:13px;">${ex.name}</span>
                <span class="ex-details" style="font-size:10px;">${ex.sets ? `${ex.sets} Sets × ${ex.reps}` : ex.reps}</span>
              </div>
            </div>
          `;
        }).join("")}
      </div>

      <div class="c-modal-notes-box">
        <label for="c-modal-notes-input">Notes for this Date</label>
        <textarea id="c-modal-notes-input" placeholder="${isFutureDate ? "Notes are disabled for future dates." : "Type notes for this date..."}" ${isFutureDate ? "disabled" : ""} oninput="saveModalDateNotes('${dateStr}')">${record.notes || ""}</textarea>
      </div>
    </div>
  `;

  document.getElementById("calendar-day-modal").classList.add("active");
}

// Toggles checked state for an exercise inside the Calendar day details modal
function toggleModalExercise(dateStr, exerciseId) {
  if (dateStr > dateToYYYYMMDD(new Date())) {
    alert("Cannot log workouts for future dates.");
    return;
  }
  const record = fitnessData[currentUser].workouts[dateStr];
  const index = record.completedExercises.indexOf(exerciseId);

  if (index === -1) {
    record.completedExercises.push(exerciseId);
  } else {
    record.completedExercises.splice(index, 1);
  }

  // Recalculate percentage
  const workout = getWorkoutForDate(dateStr);
  const total = workout.exercises.length;
  const completed = record.completedExercises.length;
  record.completionPercentage = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;

  saveData();
  
  // Re-render modal to show updated status
  openDayModal(dateStr);
  
  // Update parent views if dates align
  if (dateStr === selectedDate) {
    renderCheckIn();
  }
  
  // Re-draw calendar background cell statuses
  renderCalendar();
}

// Saves text entered in the day modal notes textarea
function saveModalDateNotes(dateStr) {
  if (dateStr > dateToYYYYMMDD(new Date())) return;
  const text = document.getElementById("c-modal-notes-input").value;
  fitnessData[currentUser].workouts[dateStr].notes = text;
  saveData();

  // Update checkin page if dates align
  if (dateStr === selectedDate) {
    document.getElementById("today-notes-input").value = text;
  }
}

function closeDayModal(event) {
  document.getElementById("calendar-day-modal").classList.remove("active");
}


/* ============================================================
   10. GOOGLE DRIVE BACKUP & RESTORE UTILITIES
   ============================================================ */

// Trigger file download containing fitnessData JSON string
function downloadBackup() {
  fitnessData.lastBackup = dateToYYYYMMDD(new Date());
  saveData();
  renderNotes(); // Refresh label immediately

  const dataStr = JSON.stringify(fitnessData, null, 2);
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
        if (confirm("Are you sure you want to restore this backup? This will overwrite your current workout and weight logs permanently.")) {
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

  // Weight Change delta
  const startWeight = STARTING_WEIGHTS[currentUser];
  const weights = fitnessData[currentUser].weights || {};
  const sortedDates = Object.keys(weights).sort();
  let latestWeight = startWeight;
  if (sortedDates.length > 0) {
    latestWeight = weights[sortedDates[sortedDates.length - 1]];
  }

  const lost = startWeight - latestWeight;
  const lostStr = lost === 0 ? "0.0 kg" : (lost > 0 ? `${lost.toFixed(1)} kg` : `+${Math.abs(lost).toFixed(1)} kg`);
  const weightChangeEl = document.getElementById("summary-weight-change");
  weightChangeEl.textContent = lostStr;
  
  const weightChangeTrend = document.getElementById("summary-weight-change-trend");
  if (lost > 0) {
    weightChangeEl.className = "stat-val text-success";
    weightChangeTrend.textContent = "Overall lost";
  } else if (lost < 0) {
    weightChangeEl.className = "stat-val text-danger";
    weightChangeTrend.textContent = "Overall gained";
  } else {
    weightChangeEl.className = "stat-val";
    weightChangeTrend.textContent = "Overall change";
  }

  // Remaining Weight to Goal
  const goalWeight = fitnessData[currentUser].goalWeight || 80.0;
  const remaining = latestWeight - goalWeight;
  const remainingEl = document.getElementById("summary-remaining-weight");
  const goalWeightEl = document.getElementById("summary-goal-weight");

  goalWeightEl.textContent = `Goal: ${goalWeight} kg`;

  if (remaining > 0) {
    remainingEl.textContent = `${remaining.toFixed(1)} kg`;
    remainingEl.className = "stat-val";
  } else {
    remainingEl.textContent = "0.0 kg";
    remainingEl.className = "stat-val text-success";
    goalWeightEl.textContent = "Goal Achieved! 🎉";
  }

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
   11. INITIALIZATION ON LOAD
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
      .then(() => console.log("Service Worker Registered"))
      .catch(err => console.error("Service Worker registration failed:", err));
  }
});
