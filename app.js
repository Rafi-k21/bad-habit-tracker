const API_URL =
  "https://bad-habit-tracker-production.up.railway.app";
  
let selectedHabitId = null;
let currentChallenge = null;
let currentProgress = [];

const habitInput = document.getElementById("habitInput");
const habitList = document.getElementById("habitList");
const habitTitle = document.getElementById("habitTitle");
const daysContainer = document.getElementById("daysContainer");

async function saveHabit() {
  const habitName = habitInput.value.trim();

  if (habitName === "") {
    alert("Please enter a habit name.");
    return;
  }

  try {
    await fetch(`${API_URL}/habits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitName })
    });

    habitInput.value = "";
    selectedHabitId = null;
    await loadHabits();
  } catch (error) {
    console.log("Save habit error:", error);
  }
}

async function loadHabits() {
  try {
    const response = await fetch(`${API_URL}/habits`);
    const habits = await response.json();

    habitList.innerHTML = "";

    if (habits.length === 0) {
      habitList.innerHTML = `<p class="empty-message">No active habits. Add a new habit to start.</p>`;
      selectedHabitId = null;
      currentChallenge = null;
      currentProgress = [];
      habitTitle.textContent = "Select or create a habit";
      daysContainer.innerHTML = "";
      updateEmptySummary();
      return;
    }

    habits.forEach(function(habit) {
      const button = document.createElement("button");
      button.className = "habit-btn";
      button.textContent = habit.habit_name;
      button.dataset.id = habit.id;

      if (habit.id === selectedHabitId) {
        button.classList.add("active");
      }

      button.onclick = function() {
        selectedHabitId = habit.id;
        loadHabitChallenge(habit.id);
        highlightSelectedHabit();
      };

      habitList.appendChild(button);
    });

    if (selectedHabitId === null) {
      selectedHabitId = habits[0].id;
    }

    await loadHabitChallenge(selectedHabitId);
    highlightSelectedHabit();
  } catch (error) {
    console.log("Load habits error:", error);
  }
}

function highlightSelectedHabit() {
  const buttons = document.querySelectorAll(".habit-btn");

  buttons.forEach(function(button) {
    if (Number(button.dataset.id) === selectedHabitId) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
}

async function loadHabitChallenge(habitId) {
  try {
    const response = await fetch(`${API_URL}/habits/${habitId}/challenge`);
    const data = await response.json();

    if (data === null) {
      habitTitle.textContent = "No active challenge found";
      daysContainer.innerHTML = "";
      updateEmptySummary();
      return;
    }

    currentChallenge = data.challenge;
    currentProgress = data.progress;

    habitTitle.textContent = currentChallenge.habit_name;

    createDays();
    updateSummary();
  } catch (error) {
    console.log("Load habit challenge error:", error);
  }
}

function createDays() {
  daysContainer.innerHTML = "";

  currentProgress.forEach(function(day) {
    const dayCard = document.createElement("div");

    if (day.status === "Yes") {
      dayCard.className = "day-card good";
    } else if (day.status === "No") {
      dayCard.className = "day-card bad";
    } else {
      dayCard.className = "day-card";
    }

    dayCard.innerHTML = `
      <h3>Day ${day.day_number}</h3>
      <p>${formatDate(day.progress_date)}</p>
      <p class="status">${getStatusText(day.status)}</p>

      <div class="btn-group">
        <button class="yes" onclick="markDay(${day.id}, 'Yes')">Yes</button>
        <button class="no" onclick="markDay(${day.id}, 'No')">No</button>
      </div>
    `;

    daysContainer.appendChild(dayCard);
  });
}

async function markDay(progressId, status) {
  try {
    await fetch(`${API_URL}/progress/${progressId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    await loadHabitChallenge(selectedHabitId);
  } catch (error) {
    console.log("Mark day error:", error);
  }
}

function getStatusText(status) {
  if (status === "Yes") return "✅ Controlled";
  if (status === "No") return "❌ Failed";
  return "⬜ Not selected";
}

function updateSummary() {
  const yesDays = currentProgress.filter(day => day.status === "Yes").length;
  const noDays = currentProgress.filter(day => day.status === "No").length;
  const percentage = Math.round((yesDays / 30) * 100);
  const streak = calculateStreak();

  document.getElementById("goodDays").textContent = yesDays;
  document.getElementById("badDays").textContent = noDays;
  document.getElementById("successRate").textContent = percentage + "%";
  document.getElementById("streak").textContent = streak + " days";
  document.getElementById("progressText").textContent = percentage + "%";
  document.getElementById("progressFill").style.width = percentage + "%";

  updateWeek(1, 0, 7);
  updateWeek(2, 7, 14);
  updateWeek(3, 14, 21);
  updateWeek(4, 21, 30);
}

function updateEmptySummary() {
  document.getElementById("goodDays").textContent = "0";
  document.getElementById("badDays").textContent = "0";
  document.getElementById("successRate").textContent = "0%";
  document.getElementById("streak").textContent = "0 days";
  document.getElementById("progressText").textContent = "0%";
  document.getElementById("progressFill").style.width = "0%";
  document.getElementById("week1").textContent = "Week 1: 0 Yes / 0 No";
  document.getElementById("week2").textContent = "Week 2: 0 Yes / 0 No";
  document.getElementById("week3").textContent = "Week 3: 0 Yes / 0 No";
  document.getElementById("week4").textContent = "Week 4: 0 Yes / 0 No";
}

function updateWeek(weekNumber, start, end) {
  const weekData = currentProgress.slice(start, end);
  const yes = weekData.filter(day => day.status === "Yes").length;
  const no = weekData.filter(day => day.status === "No").length;

  document.getElementById("week" + weekNumber).textContent =
    "Week " + weekNumber + ": " + yes + " Yes / " + no + " No";
}

function calculateStreak() {
  let streak = 0;

  for (let i = currentProgress.length - 1; i >= 0; i--) {
    if (currentProgress[i].status === "Yes") {
      streak++;
    } else if (currentProgress[i].status === "No") {
      break;
    }
  }

  return streak;
}

function formatDate(dateText) {
  const date = new Date(dateText);

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

async function completeChallenge() {
  if (currentChallenge === null) {
    alert("No challenge selected.");
    return;
  }

  const confirmComplete = confirm("Complete this challenge and move it to history?");

  if (confirmComplete === false) return;

  try {
    const response = await fetch(`${API_URL}/challenge/complete/${currentChallenge.challenge_id}`, {
      method: "POST"
    });

    const data = await response.json();

    alert(`Challenge completed!\nGood days: ${data.goodDays}\nBad days: ${data.badDays}\nSuccess: ${data.successRate}%`);

    selectedHabitId = null;
    currentChallenge = null;
    currentProgress = [];
    habitTitle.textContent = "Challenge saved to history";
    daysContainer.innerHTML = "";
    updateEmptySummary();

    await loadHabits();
  } catch (error) {
    console.log("Complete challenge error:", error);
  }
}

async function resetChallenge() {
  if (currentChallenge === null) {
    alert("No challenge selected.");
    return;
  }

  const confirmReset = confirm("Reset this challenge? All Yes/No marks will be cleared.");

  if (confirmReset === false) return;

  try {
    await fetch(`${API_URL}/challenge/reset/${currentChallenge.challenge_id}`, {
      method: "PUT"
    });

    await loadHabitChallenge(selectedHabitId);
  } catch (error) {
    console.log("Reset challenge error:", error);
  }
}

async function deleteHabit() {
  if (selectedHabitId === null) {
    alert("No habit selected.");
    return;
  }

  const confirmDelete = confirm("Delete this active habit completely?");

  if (confirmDelete === false) return;

  try {
    await fetch(`${API_URL}/habits/${selectedHabitId}`, {
      method: "DELETE"
    });

    selectedHabitId = null;
    currentChallenge = null;
    currentProgress = [];

    habitTitle.textContent = "Select or create a habit";
    daysContainer.innerHTML = "";
    updateEmptySummary();

    await loadHabits();
  } catch (error) {
    console.log("Delete habit error:", error);
  }
}

window.addEventListener("DOMContentLoaded", function() {
  loadHabits();
});