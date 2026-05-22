let adminPassword = "";
let allGuests = [];
let maxCapacity = 100;

document.addEventListener("DOMContentLoaded", () => {
  // Check Session Auth
  const savedPassword = sessionStorage.getItem("adminPassword");
  if (savedPassword) {
    adminPassword = savedPassword;
    testAuthAndInit();
  } else {
    document.getElementById("login-modal").style.display = "flex";
  }

  // Login Form Listener
  document
    .getElementById("login-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const pwdInput = document.getElementById("admin-password-input");
      adminPassword = pwdInput.value;

      const success = await testAuthAndInit();
      if (!success) {
        document.getElementById("login-error").style.display = "block";
        pwdInput.value = "";
      }
    });

  // Config Form Listener
  document
    .getElementById("config-form")
    .addEventListener("submit", handleConfigUpdate);

  // Add Guest Form Listener
  document
    .getElementById("add-guest-form")
    .addEventListener("submit", handleAddGuest);
});

// Test password and initialize dashboard
async function testAuthAndInit() {
  try {
    const response = await fetch("/api/admin/config", {
      headers: { "x-admin-password": adminPassword },
    });

    if (response.ok) {
      // Save token
      sessionStorage.setItem("adminPassword", adminPassword);

      // Hide Login modal & show dashboard
      document.getElementById("login-modal").style.display = "none";
      document.getElementById("dashboard-container").style.display = "block";

      // Initial data pull
      const data = await response.json();
      loadConfigFields(data);
      await loadGuestsData();
      return true;
    }
  } catch (err) {
    console.error(err);
  }
  sessionStorage.removeItem("adminPassword");
  return false;
}

function handleLogout() {
  sessionStorage.removeItem("adminPassword");
  window.location.reload();
}

// -------------------------------------------------------------
// EVENT CONFIGURATION
// -------------------------------------------------------------
function loadConfigFields(config) {
  if (!config) return;

  document.getElementById("nav-event-title").textContent =
    `${config.event_name} @ ${config.venue}`;
  document.getElementById("config-name").value = config.event_name;
  document.getElementById("config-venue").value = config.venue;
  document.getElementById("config-time").value = config.start_time;
  document.getElementById("config-capacity").value = config.max_capacity;
  document.getElementById("config-enforce").checked =
    config.enforce_capacity === 1;

  maxCapacity = parseInt(config.max_capacity);

  // Render door scanner link
  const host = window.location.origin;
  const scannerUrl = `${host}/scanner.html?token=${config.scanner_token}`;
  document.getElementById("scanner-link-display").value = scannerUrl;
}

async function handleConfigUpdate(e) {
  e.preventDefault();
  const event_name = document.getElementById("config-name").value;
  const venue = document.getElementById("config-venue").value;
  const start_time = document.getElementById("config-time").value;
  const max_capacity = document.getElementById("config-capacity").value;
  const enforce_capacity = document.getElementById("config-enforce").checked;

  try {
    const response = await fetch("/api/admin/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": adminPassword,
      },
      body: JSON.stringify({
        event_name,
        venue,
        start_time,
        max_capacity,
        enforce_capacity,
      }),
    });

    if (response.ok) {
      alert("Configuration updated successfully!");
      // Refresh
      const confResponse = await fetch("/api/admin/config", {
        headers: { "x-admin-password": adminPassword },
      });
      const data = await confResponse.json();
      loadConfigFields(data);
      await loadGuestsData();
    } else {
      const errData = await response.json();
      alert(`Error: ${errData.error}`);
    }
  } catch (err) {
    alert(`Failed to update config: ${err.message}`);
  }
}

function copyScannerLink() {
  const input = document.getElementById("scanner-link-display");
  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value);
  alert("Scanner link copied to clipboard!");
}

// -------------------------------------------------------------
// GUEST MANAGEMENT
// -------------------------------------------------------------
async function loadGuestsData() {
  try {
    const response = await fetch("/api/admin/guests", {
      headers: { "x-admin-password": adminPassword },
    });

    if (!response.ok) throw new Error("Failed to load guest list.");

    const data = await response.json();
    allGuests = data.guests;

    // Update stats
    document.getElementById("stat-total").textContent = data.stats.total;
    document.getElementById("stat-checked-in").textContent = data.stats.scanned;

    const percent =
      maxCapacity > 0
        ? Math.min(100, Math.round((data.stats.scanned / maxCapacity) * 100))
        : 0;
    document.getElementById("stat-capacity").textContent =
      `${percent}% (${data.stats.scanned}/${maxCapacity})`;

    const bar = document.getElementById("capacity-bar");
    bar.style.width = `${percent}%`;
    if (percent >= 90) {
      bar.classList.add("high");
    } else {
      bar.classList.remove("high");
    }

    renderGuestTable(allGuests);
  } catch (err) {
    console.error(err);
  }
}

function renderGuestTable(guests) {
  const tbody = document.getElementById("guest-table-body");

  if (guests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px;">No registered guests found.</td></tr>`;
    return;
  }

  tbody.innerHTML = guests
    .map((guest) => {
      const dateStr = guest.scanned_at
        ? new Date(guest.scanned_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "--:--";
      const ticketUrl = `/ticket.html?id=${guest.id}&name=${encodeURIComponent(guest.name)}&sig=${guest.signature}&tier=${encodeURIComponent(guest.ticket_tier)}`;

      return `
            <tr>
                <td>
                    <div style="font-weight: 600;">${escapeHTML(guest.name)}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHTML(guest.email)}</div>
                </td>
                <td>
                    <span style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase;">${escapeHTML(guest.ticket_tier)}</span>
                </td>
                <td>
                    ${
                      guest.is_scanned === 1
                        ? `<span class="badge badge-success">Checked In</span>`
                        : `<span class="badge badge-error">Not Checked In</span>`
                    }
                </td>
                <td>
                    <span style="font-size: 0.9rem; color: var(--text-secondary);">${dateStr}</span>
                </td>
                <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 8px;">
                        <a href="${ticketUrl}" target="_blank" class="btn btn-secondary btn-sm" style="padding: 6px 12px; font-size: 0.8rem;">Ticket</a>
                        <button onclick="openEditModal('${guest.id}', '${escapeJS(guest.name)}', '${escapeJS(guest.email)}', '${escapeJS(guest.ticket_tier)}')" class="btn btn-secondary btn-sm" style="padding: 6px 12px; font-size: 0.8rem;">Edit</button>
                        <button onclick="deleteGuest('${guest.id}', '${escapeJS(guest.name)}')" class="btn btn-danger btn-sm" style="padding: 6px 12px; font-size: 0.8rem;">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");
}

function filterGuestTable() {
  const val = document
    .getElementById("guest-search")
    .value.toLowerCase()
    .trim();
  if (!val) {
    renderGuestTable(allGuests);
    return;
  }

  const filtered = allGuests.filter(
    (g) =>
      g.name.toLowerCase().includes(val) ||
      g.email.toLowerCase().includes(val) ||
      g.ticket_tier.toLowerCase().includes(val),
  );
  renderGuestTable(filtered);
}

async function handleAddGuest(e) {
  e.preventDefault();
  const name = document.getElementById("guest-name-input").value;
  const email = document.getElementById("guest-email-input").value;
  const ticket_tier = document.getElementById("guest-tier-select").value;

  try {
    const response = await fetch("/api/admin/guests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": adminPassword,
      },
      body: JSON.stringify({ name, email, ticket_tier }),
    });

    if (response.ok) {
      document.getElementById("guest-name-input").value = "";
      document.getElementById("guest-email-input").value = "";
      document.getElementById("guest-tier-select").value = "general";
      await loadGuestsData();
    } else {
      const errData = await response.json();
      alert(`Error: ${errData.error}`);
    }
  } catch (err) {
    alert(`Failed to add guest: ${err.message}`);
  }
}

async function deleteGuest(id, name) {
  if (
    !confirm(
      `Are you sure you want to delete guest: "${name}"? This removes ticket authorization.`,
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/guests/${id}`, {
      method: "DELETE",
      headers: { "x-admin-password": adminPassword },
    });

    if (response.ok) {
      await loadGuestsData();
    } else {
      const errData = await response.json();
      alert(`Error: ${errData.error}`);
    }
  } catch (err) {
    alert(`Failed to delete guest: ${err.message}`);
  }
}

// -------------------------------------------------------------
// GUEST EDIT MODAL
// -------------------------------------------------------------
function openEditModal(id, name, email, ticketTier) {
  document.getElementById("edit-guest-id").value = id;
  document.getElementById("edit-guest-name").value = name;
  document.getElementById("edit-guest-email").value = email;
  document.getElementById("edit-guest-tier").value = ticketTier;
  document.getElementById("edit-modal-error").style.display = "none";
  document.getElementById("edit-modal").classList.add("active");
}

function closeEditModal() {
  document.getElementById("edit-modal").classList.remove("active");
}

// Attach edit form listener
document
  .getElementById("edit-guest-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-guest-id").value;
    const name = document.getElementById("edit-guest-name").value;
    const email = document.getElementById("edit-guest-email").value;
    const ticket_tier = document.getElementById("edit-guest-tier").value;
    const errorDiv = document.getElementById("edit-modal-error");

    try {
      const response = await fetch(`/api/admin/guests/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ name, email, ticket_tier }),
      });

      if (response.ok) {
        closeEditModal();
        await loadGuestsData();
      } else {
        const errData = await response.json();
        errorDiv.textContent = errData.error || "Failed to update guest";
        errorDiv.style.display = "block";
      }
    } catch (err) {
      errorDiv.textContent = `Network error: ${err.message}`;
      errorDiv.style.display = "block";
    }
  });

// -------------------------------------------------------------
// CSV BULK UPLOAD HANDLERS
// -------------------------------------------------------------
function triggerFileInput() {
  document.getElementById("csv-file-input").click();
}

function handleCsvFile(e) {
  const file = e.target.files[0];
  if (file) {
    processCsvFile(file);
  }
}

// Drag & drop handlers
const dropArea = document.getElementById("csv-drop-area");

["dragenter", "dragover"].forEach((eventName) => {
  dropArea.addEventListener(
    eventName,
    (e) => {
      e.preventDefault();
      dropArea.style.borderColor = "var(--border-focus)";
    },
    false,
  );
});

["dragleave", "drop"].forEach((eventName) => {
  dropArea.addEventListener(
    eventName,
    (e) => {
      e.preventDefault();
      dropArea.style.borderColor = "var(--border-color)";
    },
    false,
  );
});

dropArea.addEventListener("drop", (e) => {
  const dt = e.dataTransfer;
  const file = dt.files[0];
  if (file) {
    processCsvFile(file);
  }
});

function processCsvFile(file) {
  const reader = new FileReader();
  const label = document.getElementById("upload-label");

  label.textContent = `Uploading "${file.name}"...`;

  reader.onload = async (e) => {
    const text = e.target.result;
    try {
      const response = await fetch("/api/admin/guests/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ csvData: text }),
      });

      const data = await response.json();

      if (response.ok) {
        let statusMsg = `Successfully imported ${data.successCount} guests.`;

        // Show errors if some rows failed
        const errDiv = document.getElementById("csv-errors");
        if (data.errors && data.errors.length > 0) {
          errDiv.style.display = "block";
          errDiv.innerHTML = `
                        <div class="csv-error-list">
                            <strong>Import warnings (${data.errors.length} failed rows):</strong>
                            <ul style="margin-top: 6px; padding-left: 16px;">
                                ${data.errors.map((err) => `<li>${escapeHTML(err)}</li>`).join("")}
                            </ul>
                        </div>
                    `;
          statusMsg += ` (${data.errors.length} rows rejected)`;
        } else {
          errDiv.style.display = "none";
        }

        alert(statusMsg);
        label.textContent = `Drop guest CSV file here, or click to upload`;
        await loadGuestsData();
      } else {
        alert(`Upload failed: ${data.error}`);
        label.textContent = `Upload failed. Try again.`;
      }
    } catch (err) {
      alert(`Network error uploading file: ${err.message}`);
      label.textContent = `Upload failed. Try again.`;
    }
  };
  reader.readAsText(file);
}

// Helpers
function escapeHTML(str) {
  if (!str) return "";
  return str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        tag
      ] || tag,
  );
}

function escapeJS(str) {
  if (!str) return "";
  return str.replace(/'/g, "\\'");
}
