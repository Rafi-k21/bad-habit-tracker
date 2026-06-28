const API_URL = "https://bad-habit-tracker-production.up.railway.app";

async function loadStats() {
  try {
    const response = await fetch(`${API_URL}/stats`);
    const stats = await response.json();

    document.getElementById("totalChallenges").textContent =
      stats.total_challenges;

    document.getElementById("averageSuccess").textContent =
      stats.average_success + "%";

    document.getElementById("bestSuccess").textContent =
      stats.best_success + "%";

    document.getElementById("totalGoodDays").textContent =
      stats.total_good_days;

  } catch (error) {
    console.log("Stats error:", error);
  }
}

async function loadHeatmap() {
  try {
    const response = await fetch(`${API_URL}/heatmap`);
    const days = await response.json();

    const heatmap = document.getElementById("heatmap");
    heatmap.innerHTML = "";

    days.forEach((day) => {
      const box = document.createElement("div");

      if (day.status === "Yes") {
        box.className = "heat-box good-box";
      } else if (day.status === "No") {
        box.className = "heat-box bad-box";
      } else {
        box.className = "heat-box empty-box";
      }

      box.title = `${formatDate(day.progress_date)} - ${day.status || "Not selected"}`;

      heatmap.appendChild(box);
    });

  } catch (error) {
    console.log("Heatmap error:", error);
  }
}

function formatDate(dateText) {
  return new Date(dateText).toLocaleDateString("en-GB");
}

loadHeatmap();
loadStats();