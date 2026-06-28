let habitName = localStorage.getItem("habitName") || "";
let tracker = JSON.parse(localStorage.getItem("tracker")) || Array(30).fill("");

const habitInput = document.getElementById("habitInput");
const habitTitle = document.getElementById("habitTitle");
const daysContainer = document.getElementById("daysContainer");

function saveHabit() {
  if (habitInput.value.trim() === "") {
    alert("Please enter a habit name.");
    return;
  }

  habitName = habitInput.value.trim();
  localStorage.setItem("habitName", habitName);

  habitInput.value = "";
  showHabit();
}

function showHabit() {
  if (habitName === "") {
    habitTitle.textContent = "Your habit will appear here";
  } else {
    habitTitle.textContent = habitName;
  }
}

function createDays() {
  daysContainer.innerHTML = "";

  for (let i = 0; i < 30; i++) {
    const dayCard = document.createElement("div");

    if (tracker[i] === "Yes") {
      dayCard.className = "day-card good";
    } else if (tracker[i] === "No") {
      dayCard.className = "day-card bad";
    } else {
      dayCard.className = "day-card";
    }

    dayCard.innerHTML = `
      <h3>Day ${i + 1}</h3>
      <p class="status">${getStatusIcon(tracker[i])}</p>

      <div class="btn-group">
        <button class="yes" onclick="markDay(${i}, 'Yes')">Yes</button>
        <button class="no" onclick="markDay(${i}, 'No')">No</button>
      </div>
    `;

    daysContainer.appendChild(dayCard);
  }
}

function getStatusIcon(status) {
  if (status === "Yes") {
    return "✅ Controlled";
  } else if (status === "No") {
    return "❌ Failed";
  } else {
    return "⬜ Not selected";
  }
}

function markDay(dayIndex, status) {
  tracker[dayIndex] = status;

  localStorage.setItem("tracker", JSON.stringify(tracker));

  createDays();
  updateSummary();
}

function updateSummary() {
  const yesDays = tracker.filter(day => day === "Yes").length;
  const noDays = tracker.filter(day => day === "No").length;

  const percentage = Math.round((yesDays / 30) * 100);
  const streak = calculateStreak();

  document.getElementById("goodDays").textContent = yesDays;
  document.getElementById("badDays").textContent = noDays;
  document.getElementById("successRate").textContent = `${percentage}%`;
  document.getElementById("streak").textContent = `${streak} days`;

  document.getElementById("progressText").textContent = `${percentage}%`;
  document.getElementById("progressFill").style.width = `${percentage}%`;

  updateWeek(1, 0, 7);
  updateWeek(2, 7, 14);
  updateWeek(3, 14, 21);
  updateWeek(4, 21, 30);
}

function updateWeek(weekNumber, start, end) {
  const weekData = tracker.slice(start, end);

  const yes = weekData.filter(day => day === "Yes").length;
  const no = weekData.filter(day => day === "No").length;

  document.getElementById(`week${weekNumber}`).textContent =
    `Week ${weekNumber}: ${yes} Yes / ${no} No`;
}

function calculateStreak() {
  let streak = 0;

  for (let i = tracker.length - 1; i >= 0; i--) {
    if (tracker[i] === "Yes") {
      streak++;
    } else if (tracker[i] === "No") {
      break;
    }
  }

  return streak;
}

function resetTracker() {
  const confirmReset = confirm("Are you sure you want to reset everything?");

  if (confirmReset === false) {
    return;
  }

  tracker = Array(30).fill("");
  habitName = "";

  localStorage.removeItem("tracker");
  localStorage.removeItem("habitName");

  showHabit();
  createDays();
  updateSummary();
}

showHabit();
createDays();
updateSummary();