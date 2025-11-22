import Habit from "../models/Habit.js";


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
        recent[Math.floor(diffDays)] = 4; 
      }
    }
  }

  return recent;
}


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


function formatHabit(habit) {
  return {
    id: habit._id,
    name: habit.name,
    description: habit.description,
    createdAt: habit.createdAt,
    timesPerDay: habit.timesPerDay || 1,
    frequency: habit.frequency || "Daily",

    
    recent: generateRecent(habit.datesCompleted),

    currentStreak: computeCurrentStreak(habit.datesCompleted),
    longestStreak: computeLongestStreak(habit.datesCompleted),
  };
}


export const createHabit = async (req, res) => {
  try {
    const { name, description = "" } = req.body;

    const exists = await Habit.findOne({
      userId: req.user,
      name,
    });

    if (exists) {
      return res.status(400).json({ message: "Habit already exists" });
    }

    const habit = await Habit.create({
      userId: req.user,
      name,
      description,
      datesCompleted: [],
      currentStreak: 0,
      longestStreak: 0,
      lastCompleted: null,
    });
    await habit.save();

    return res.status(201).json({ habit: formatHabit(habit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to create habit" });
  }
};


export const getHabits = async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user });

    return res.json({
      habits: habits.map(formatHabit),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch habits" });
  }
};


export const getHabitById = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user,
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


export const updateHabit = async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user },
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


export const recordHabitCompletion = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user,
    });

    if (!habit) return res.status(404).json({ message: "Habit not found" });

    
    await habit.recordCompletion();
    await habit.save();

    return res.json({ habit: formatHabit(habit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to record completion" });
  }
};


export const deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({
      _id: req.params.id,
      userId: req.user,
    });

    if (!habit) return res.status(404).json({ message: "Habit not found" });

    return res.json({ message: "Habit deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to delete habit" });
  }
};
