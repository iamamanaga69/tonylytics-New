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
function initData() {
  return {
    aman: {
      _weightHistory: [
        { date: "2026-06-15", weight: STARTING_WEIGHTS.aman }
      ],
      _generalNotes: ""
    },
    rishit: {
      _weightHistory: [
        { date: "2026-06-15", weight: STARTING_WEIGHTS.rishit }
      ],
      _generalNotes: ""
    }
  };
}

// Load data from localStorage
function loadData() {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored) {
    try {
      fitnessData = JSON.parse(stored);
      // Ensure basic structure exists if restored file was incomplete
      if (!fitnessData.aman) fitnessData.aman = initData().aman;
      if (!fitnessData.rishit) fitnessData.rishit = initData().rishit;
      if (!fitnessData.aman._weightHistory) fitnessData.aman._weightHistory = [{ date: "2026-06-15", weight: STARTING_WEIGHTS.aman }];
      if (!fitnessData.rishit._weightHistory) fitnessData.rishit._weightHistory = [{ date: "2026-06-15", weight: STARTING_WEIGHTS.rishit }];
    } catch (e) {
      console.error("Error parsing fitness data from localStorage, initializing fresh", e);
      fitnessData = initData();
    }
  } else {
    fitnessData = initData();
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

// Ensures a workout log record exists in fitnessData for the specified date
function ensureDateRecord(user, dateStr) {
  if (!fitnessData[user]) {
    fitnessData[user] = {};
  }
  if (!fitnessData[user][dateStr]) {
    fitnessData[user][dateStr] = {
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

// Switch between page panels (Today, Calendar, Weights, Library, Notes)
function switchPage(pageId) {
  activePage = pageId;

  // Toggle active styling on navigation buttons
  const navIds = ["today", "calendar", "weights", "library", "notes"];
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
  if (activePage === "today") {
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
  const record = fitnessData[currentUser][selectedDate];
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

  // Render checklist items
  const checklistContainer = document.getElementById("checklist-container");
  checklistContainer.innerHTML = "";

  workout.exercises.forEach(ex => {
    const isChecked = record.completedExercises.includes(ex.exerciseId);

    // Create row div
    const row = document.createElement("div");
    row.className = `checklist-row ${isChecked ? "checked" : ""}`;
    row.onclick = () => toggleExerciseCheck(ex.exerciseId);

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

  lucide.createIcons();
  updateProgressBar();
}

// Toggles checked state for an exercise in Today's checklist
function toggleExerciseCheck(exerciseId) {
  ensureDateRecord(currentUser, selectedDate);
  const record = fitnessData[currentUser][selectedDate];
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
  const record = fitnessData[currentUser][selectedDate];
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
  ensureDateRecord(currentUser, selectedDate);
  fitnessData[currentUser][selectedDate].notes = document.getElementById("today-notes-input").value;
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
    // JS getDay() returns 0=Sunday, 1=Monday... We map to 0=Monday, ..., 6=Sunday
    let firstDayIndex = new Date(year, month, 1).getDay();
    let padCount = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // shift so Monday is 0

    for (let i = 0; i < padCount; i++) {
      const pad = document.createElement("div");
      pad.className = "day-cell empty-pad";
      daysGrid.appendChild(pad);
    }

    // Render calendar days
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
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
        // Evaluate active status indicator based on data record
        ensureDateRecord(currentUser, dateStr);
        const record = fitnessData[currentUser][dateStr];
        const workout = getWorkoutForDate(dateStr);
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
  const history = fitnessData[currentUser]._weightHistory || [];
  const startingWeight = STARTING_WEIGHTS[currentUser];
  
  // Set starting weight label
  document.getElementById("weight-stat-start").textContent = `${startingWeight} kg`;

  // Find latest logged weight
  let latestWeight = startingWeight;
  let latestDate = "15 June 2026";

  if (history.length > 0) {
    // Sort entries by date descending to find the newest entry
    history.sort((a, b) => b.date.localeCompare(a.date));
    latestWeight = history[0].weight;
    latestDate = formatDateLong(history[0].date);
  }

  const changeVal = Math.round((latestWeight - startingWeight) * 10) / 10;
  let changeText = "0.0 kg";
  let changeClass = "";

  if (changeVal > 0) {
    changeText = `+${changeVal} kg`;
    changeClass = "text-danger"; // Weight gain color (optional)
  } else if (changeVal < 0) {
    changeText = `${changeVal} kg`;
    changeClass = "text-success"; // Weight loss color
  }

  // Update Stats Cards
  document.getElementById("weight-stat-latest").textContent = `${latestWeight} kg`;
  document.getElementById("weight-stat-latest-date").textContent = latestDate;
  
  const changeEl = document.getElementById("weight-stat-change");
  changeEl.textContent = changeText;
  changeEl.className = `stat-val ${changeClass}`;

  // Default input date to today's date if today is within bounds
  const todayStr = dateToYYYYMMDD(new Date());
  document.getElementById("weight-input-date").value = isWithinSubscription(todayStr) ? todayStr : START_DATE_STR;
  document.getElementById("weight-input-val").value = "";

  // Render History Table body
  const tbody = document.getElementById("weight-history-tbody");
  tbody.innerHTML = "";

  if (history.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">No weight entries logged yet.</td></tr>`;
  } else {
    history.forEach((entry, idx) => {
      const tr = document.createElement("tr");

      const tdDate = document.createElement("td");
      tdDate.textContent = formatDateLong(entry.date);

      const tdWeight = document.createElement("td");
      tdWeight.style.fontWeight = "600";
      tdWeight.textContent = `${entry.weight} kg`;

      const tdAction = document.createElement("td");
      
      // Prevent deleting the initial starting date entry to preserve baseline
      if (entry.date === START_DATE_STR) {
        tdAction.innerHTML = `<span style="font-size: 11px; color:var(--text-muted);">Baseline</span>`;
      } else {
        const delBtn = document.createElement("button");
        delBtn.className = "btn btn-danger-subtle btn-sm";
        delBtn.innerHTML = `<i data-lucide="trash-2" style="width:13px;height:13px;"></i> Delete`;
        delBtn.onclick = () => deleteWeightEntry(entry.date);
        tdAction.appendChild(delBtn);
      }

      tr.appendChild(tdDate);
      tr.appendChild(tdWeight);
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
  }

  lucide.createIcons();
}

// Log a new weight entry from form submission
function logNewWeight(event) {
  event.preventDefault();
  const weight = parseFloat(document.getElementById("weight-input-val").value);
  const date = document.getElementById("weight-input-date").value;

  if (!isWithinSubscription(date)) {
    alert(`Please select a date within the subscription period: ${formatDateLong(START_DATE_STR)} to ${formatDateLong(END_DATE_STR)}`);
    return;
  }

  if (isNaN(weight) || weight <= 0) {
    alert("Please enter a valid weight numerical value.");
    return;
  }

  if (!fitnessData[currentUser]._weightHistory) {
    fitnessData[currentUser]._weightHistory = [];
  }

  const history = fitnessData[currentUser]._weightHistory;
  const existingIdx = history.findIndex(h => h.date === date);

  if (existingIdx !== -1) {
    // Overwrite existing record for date
    history[existingIdx].weight = weight;
  } else {
    // Insert new weight entry
    history.push({ date, weight });
  }

  // Sort history array by date descending
  history.sort((a, b) => b.date.localeCompare(a.date));

  saveData();
  renderWeightTracker();
}

// Delete custom weight entry
function deleteWeightEntry(dateStr) {
  if (confirm(`Are you sure you want to delete the weight entry for ${formatDateLong(dateStr)}?`)) {
    const history = fitnessData[currentUser]._weightHistory || [];
    fitnessData[currentUser]._weightHistory = history.filter(h => h.date !== dateStr);
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
    const nameMatch = ex.name.toLowerCase().includes(query);
    const muscleMatch = ex.muscles.some(m => m.toLowerCase().includes(query));
    return nameMatch || muscleMatch;
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
  const notes = fitnessData[currentUser]._generalNotes || "";
  document.getElementById("general-notes-input").value = notes;
}

// Saves text entered in the general notes textarea automatically (autosave)
function saveGeneralNotes() {
  fitnessData[currentUser]._generalNotes = document.getElementById("general-notes-input").value;
  saveData();
}

/* ============================================================
   9. DETAIL POPUP DIALOGS (MODALS)
   ============================================================ */

/* ── EXERCISE INSTRUCTIONS MODAL ────────────────────────── */
function openExerciseModal(exerciseId) {
  const exercise = exerciseLibrary.find(e => e.id === exerciseId);
  if (!exercise) return;

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

      <div class="modal-section" style="margin-bottom:0;">
        <h4 class="modal-section-title">Recommended Rest Period</h4>
        <p class="modal-text">${exercise.restTime}</p>
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
  const record = fitnessData[currentUser][dateStr];
  const workout = getWorkoutForDate(dateStr);

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
            <div class="c-modal-chk-row ${isChecked ? "checked" : ""}" onclick="toggleModalExercise('${dateStr}', '${ex.exerciseId}')">
              <div class="custom-checkbox-wrapper">
                <input type="checkbox" class="custom-checkbox-input" ${isChecked ? "checked" : ""}>
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
        <textarea id="c-modal-notes-input" placeholder="Type notes for this date..." oninput="saveModalDateNotes('${dateStr}')">${record.notes || ""}</textarea>
      </div>
    </div>
  `;

  document.getElementById("calendar-day-modal").classList.add("active");
}

// Toggles checked state for an exercise inside the Calendar day details modal
function toggleModalExercise(dateStr, exerciseId) {
  const record = fitnessData[currentUser][dateStr];
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
  const text = document.getElementById("c-modal-notes-input").value;
  fitnessData[currentUser][dateStr].notes = text;
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
      
      // Validation check for primary user structures
      if (parsed && parsed.aman && parsed.rishit) {
        if (confirm("Are you sure you want to restore this backup? This will overwrite your current workout and weight logs permanently.")) {
          fitnessData = parsed;
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
  switchPage("today");

  // Register PWA Service Worker for offline support and quick loads
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js")
      .then(() => console.log("Service Worker Registered"))
      .catch(err => console.error("Service Worker registration failed:", err));
  }
});
