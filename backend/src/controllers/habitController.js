import Habit from "../models/Habit.js";

// ⭐ Helper: generate last 28 days heatmap from datesCompleted[]
function generateRecent(datesCompleted) {
  const recent = Array(28).fill(0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d of datesCompleted) {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);

    const diffDays =
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays >= 0 && diffDays < 28) {
      recent[Math.floor(diffDays)] += 1;
      if (recent[Math.floor(diffDays)] > 4) {
        recent[Math.floor(diffDays)] = 4; // cap intensity at 4
      }
    }
  }

  return recent;
}

// ⭐ Helper: compute longest streak from datesCompleted[]
function computeLongestStreak(datesCompleted) {
  if (!datesCompleted.length) return 0;

  const days = new Set(
    datesCompleted.map((d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x.getTime();
    })
  );

  let longest = 0;
  let current = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // check last 365 days
  for (let i = 0; i < 365; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    day.setHours(0, 0, 0, 0);

    if (days.has(day.getTime())) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }

  return longest;
}

// ⭐ Helper: compute current streak
function computeCurrentStreak(datesCompleted) {
  if (!datesCompleted.length) return 0;

  const days = new Set(
    datesCompleted.map((d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x.getTime();
    })
  );

  let streak = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // check today, yesterday, ...
  for (let i = 0; i < 365; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    day.setHours(0, 0, 0, 0);

    if (days.has(day.getTime())) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ⭐ FORMATTER: Return habit object EXACTLY as frontend wants
function formatHabit(habit) {
  return {
    id: habit._id,
    name: habit.name,
    description: habit.description,
    createdAt: habit.createdAt,
    timesPerDay: habit.timesPerDay || 1,
    frequency: habit.frequency || "Daily",

    // computed
    recent: generateRecent(habit.datesCompleted),

    currentStreak: computeCurrentStreak(habit.datesCompleted),
    longestStreak: computeLongestStreak(habit.datesCompleted),
  };
}

// -----------------------------------------------------------------------------------
// ✔ CREATE HABIT
// -----------------------------------------------------------------------------------
export const createHabit = async (req, res) => {
  try {
    const { name, description = "" } = req.body;

    const exists = await Habit.findOne({
      userId: req.user.id,
      name,
    });

    if (exists) {
      return res.status(400).json({ message: "Habit already exists" });
    }

    const habit = await Habit.create({
      userId: req.user.id,
      name,
      description,
      datesCompleted: [],
      currentStreak: 0,
      longestStreak: 0,
      lastCompleted: null,
    });

    return res.status(201).json({ habit: formatHabit(habit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to create habit" });
  }
};

// -----------------------------------------------------------------------------------
// ✔ GET ALL HABITS
// -----------------------------------------------------------------------------------
export const getHabits = async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user.id });

    return res.json({
      habits: habits.map(formatHabit),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch habits" });
  }
};

// -----------------------------------------------------------------------------------
// ✔ GET HABIT BY ID
// -----------------------------------------------------------------------------------
export const getHabitById = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    return res.json({ habit: formatHabit(habit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to get habit" });
  }
};

// -----------------------------------------------------------------------------------
// ✔ UPDATE HABIT
// -----------------------------------------------------------------------------------
export const updateHabit = async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );

    if (!habit) return res.status(404).json({ message: "Habit not found" });

    return res.json({ habit: formatHabit(habit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to update habit" });
  }
};

// -----------------------------------------------------------------------------------
// ✔ RECORD COMPLETION (Mark Today)
// -----------------------------------------------------------------------------------
export const recordHabitCompletion = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!habit) return res.status(404).json({ message: "Habit not found" });

    // Call built-in model method
    await habit.recordCompletion();
    await habit.save();

    return res.json({ habit: formatHabit(habit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to record completion" });
  }
};

// -----------------------------------------------------------------------------------
// ✔ DELETE HABIT
// -----------------------------------------------------------------------------------
export const deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!habit) return res.status(404).json({ message: "Habit not found" });

    return res.json({ message: "Habit deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to delete habit" });
  }
};
