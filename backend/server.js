const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5050;

const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "bad_habit_tracker",
  waitForConnections: true,
  connectionLimit: 10
});

app.get("/", (req, res) => {
  res.send("Backend running on port 5050");
});

app.get("/habits", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT habits.id, habits.habit_name
      FROM habits
      JOIN challenges ON habits.id = challenges.habit_id
      WHERE challenges.is_completed = FALSE
      ORDER BY habits.id DESC
    `);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to load habits", error: error.message });
  }
});

app.post("/habits", async (req, res) => {
  try {
    const { habitName } = req.body;

    if (!habitName) {
      return res.status(400).json({ message: "Habit name is required" });
    }

    const [habitResult] = await db.query(
      "INSERT INTO habits (habit_name) VALUES (?)",
      [habitName]
    );

    const habitId = habitResult.insertId;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 29);

    const [challengeResult] = await db.query(
      "INSERT INTO challenges (habit_id, start_date, end_date) VALUES (?, ?, ?)",
      [habitId, startDate, endDate]
    );

    const challengeId = challengeResult.insertId;

    for (let i = 1; i <= 30; i++) {
      const progressDate = new Date(startDate);
      progressDate.setDate(startDate.getDate() + i - 1);

      await db.query(
        "INSERT INTO daily_progress (challenge_id, day_number, progress_date) VALUES (?, ?, ?)",
        [challengeId, i, progressDate]
      );
    }

    res.json({ message: "Habit created successfully", habitId, challengeId });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.get("/habits/:id/challenge", async (req, res) => {
  try {
    const habitId = req.params.id;

    const [challengeResult] = await db.query(`
      SELECT 
        challenges.id AS challenge_id,
        challenges.start_date,
        challenges.end_date,
        challenges.is_completed,
        habits.id AS habit_id,
        habits.habit_name
      FROM challenges
      JOIN habits ON challenges.habit_id = habits.id
      WHERE habits.id = ? AND challenges.is_completed = FALSE
      ORDER BY challenges.id DESC
      LIMIT 1
    `, [habitId]);

    if (challengeResult.length === 0) {
      return res.json(null);
    }

    const challenge = challengeResult[0];

    const [progressResult] = await db.query(
      "SELECT * FROM daily_progress WHERE challenge_id = ? ORDER BY day_number ASC",
      [challenge.challenge_id]
    );

    res.json({ challenge, progress: progressResult });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.put("/progress/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const progressId = req.params.id;

    if (status !== "Yes" && status !== "No" && status !== "") {
      return res.status(400).json({ message: "Invalid status" });
    }

    await db.query("UPDATE daily_progress SET status = ? WHERE id = ?", [status, progressId]);
    res.json({ message: "Progress updated" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.put("/challenge/reset/:id", async (req, res) => {
  try {
    const challengeId = req.params.id;

    await db.query("UPDATE daily_progress SET status = '' WHERE challenge_id = ?", [challengeId]);

    res.json({ message: "Challenge reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Reset error", error: error.message });
  }
});

app.post("/challenge/complete/:id", async (req, res) => {
  try {
    const challengeId = req.params.id;

    const [challengeRows] = await db.query(`
      SELECT challenges.*, habits.habit_name
      FROM challenges
      JOIN habits ON challenges.habit_id = habits.id
      WHERE challenges.id = ?
    `, [challengeId]);

    if (challengeRows.length === 0) {
      return res.status(404).json({ message: "Challenge not found" });
    }

    const challenge = challengeRows[0];

    const [progressRows] = await db.query(
      "SELECT * FROM daily_progress WHERE challenge_id = ?",
      [challengeId]
    );

    const goodDays = progressRows.filter(day => day.status === "Yes").length;
    const badDays = progressRows.filter(day => day.status === "No").length;
    const successRate = Math.round((goodDays / 30) * 100);

    await db.query(`
      INSERT INTO history 
      (habit_id, habit_name, start_date, end_date, good_days, bad_days, success_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      challenge.habit_id,
      challenge.habit_name,
      challenge.start_date,
      challenge.end_date,
      goodDays,
      badDays,
      successRate
    ]);

    await db.query("UPDATE challenges SET is_completed = TRUE WHERE id = ?", [challengeId]);

    res.json({
      message: "Challenge completed and saved to history",
      goodDays,
      badDays,
      successRate
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.delete("/habits/:id", async (req, res) => {
  try {
    const habitId = req.params.id;
    await db.query("DELETE FROM habits WHERE id = ?", [habitId]);
    res.json({ message: "Habit deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete error", error: error.message });
  }
});

app.get("/history", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM history ORDER BY id DESC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "History error", error: error.message });
  }
});

app.delete("/history/:id", async (req, res) => {
  try {
    const historyId = req.params.id;
    await db.query("DELETE FROM history WHERE id = ?", [historyId]);
    res.json({ message: "History item deleted" });
  } catch (error) {
    res.status(500).json({ message: "Delete history error", error: error.message });
  }
});

app.get("/stats", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total_challenges,
        COALESCE(ROUND(AVG(success_rate)), 0) AS average_success,
        COALESCE(MAX(success_rate), 0) AS best_success,
        COALESCE(SUM(good_days), 0) AS total_good_days,
        COALESCE(SUM(bad_days), 0) AS total_bad_days
      FROM history
    `);

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Stats error", error: error.message });
  }
});

app.get("/heatmap", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT progress_date, status
      FROM daily_progress
      ORDER BY progress_date ASC
    `);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Heatmap error", error: error.message });
  }
});

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});