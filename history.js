const API_URL = "https://bad-habit-tracker-production.up.railway.app";
const historyList = document.getElementById("historyList");

async function loadHistory() {
  try {
    const response = await fetch(`${API_URL}/history`);
    const history = await response.json();

    historyList.innerHTML = "";

    if (history.length === 0) {
      historyList.innerHTML = `<p class="empty-message">No completed challenges yet.</p>`;
      return;
    }

    history.forEach(function(item) {
      const card = document.createElement("div");
      card.className = "history-card";

      card.innerHTML = `
        <h3>${item.habit_name}</h3>
        <p>Good Days: ${item.good_days}/30</p>
        <p>Bad Days: ${item.bad_days}</p>
        <p>Success: ${item.success_rate}%</p>
        <p>Completed: ${new Date(item.completed_at).toLocaleDateString("en-GB")}</p>
        <button class="delete-btn" onclick="deleteHistory(${item.id})">Delete</button>
      `;

      historyList.appendChild(card);
    });
  } catch (error) {
    console.log("Load history error:", error);
  }
}

async function deleteHistory(historyId) {
  const confirmDelete = confirm("Delete this history record?");

  if (confirmDelete === false) return;

  try {
    await fetch(`${API_URL}/history/${historyId}`, {
      method: "DELETE"
    });

    await loadHistory();
  } catch (error) {
    console.log("Delete history error:", error);
  }
}

loadHistory();