document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const loginForm = document.getElementById("login-form");
  const logoutButton = document.getElementById("logout-button");
  const loginStatus = document.getElementById("login-status");
  const messageDiv = document.getElementById("message");

  const authState = {
    token: null,
    username: null,
  };

  function updateLoginUI() {
    if (authState.token) {
      loginStatus.textContent = `Logged in as ${authState.username}`;
      loginStatus.classList.remove("hidden");
      logoutButton.classList.remove("hidden");
      loginForm.querySelector("button[type='submit']").disabled = true;
    } else {
      loginStatus.textContent = "";
      loginStatus.classList.add("hidden");
      logoutButton.classList.add("hidden");
      loginForm.querySelector("button[type='submit']").disabled = false;
    }
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML = details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${authState.token ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ""}</li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!authState.token) {
      showMessage("Teacher login required to unregister a student.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${authState.token}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById("teacher-username").value.trim();
    const password = document.getElementById("teacher-password").value;

    if (!username || !password) {
      showMessage("Please enter a username and password.", "error");
      return;
    }

    const token = btoa(`${username}:${password}`);

    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: {
          Authorization: `Basic ${token}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        authState.token = token;
        authState.username = username;
        updateLoginUI();
        showMessage("Teacher login successful.", "success");
        fetchActivities();
      } else {
        authState.token = null;
        authState.username = null;
        updateLoginUI();
        showMessage(result.detail || "Invalid teacher credentials.", "error");
      }
    } catch (error) {
      showMessage("Failed to login. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  }

  function handleLogout() {
    authState.token = null;
    authState.username = null;
    updateLoginUI();
    showMessage("Logged out.", "success");
    fetchActivities();
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  signupForm.addEventListener("submit", handleSignup);
  loginForm.addEventListener("submit", handleLogin);
  logoutButton.addEventListener("click", handleLogout);

  updateLoginUI();
  fetchActivities();
});
