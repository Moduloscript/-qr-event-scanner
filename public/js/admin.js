let adminPassword = "";

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

  // PDF Upload Listener
  document
    .getElementById("pdf-file-input")
    .addEventListener("change", handlePdfFileSelect);

  // Generate QR Button Listener
  document
    .getElementById("generate-qr-btn")
    .addEventListener("click", generateQrCode);

  // Reset Event Button Listener
  document
    .getElementById("reset-event-btn")
    .addEventListener("click", handleResetEvent);
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

  // PDF status — persists across reloads (stored in DB)
  if (config.program_pdf) {
    const sizeKb = Math.round((config.program_pdf.length * 0.75) / 1024);
    document.getElementById("pdf-status").textContent =
      `PDF uploaded (${sizeKb} KB)`;
    document.getElementById("pdf-status").style.display = "inline";
    document.getElementById("pdf-replace-btn").style.display = "inline";
    document.getElementById("pdf-file-input").style.display = "none";
  } else {
    document.getElementById("pdf-status").style.display = "none";
    document.getElementById("pdf-replace-btn").style.display = "none";
    document.getElementById("pdf-file-input").style.display = "block";
  }

  // Auto-generate QR code if event is configured — persists across reloads
  generateQrCode();

  // Render Event Story fields
  loadEventStoryFields(config);
}

// -------------------------------------------------------------
// PDF UPLOAD
// -------------------------------------------------------------
let pendingPdfDataUri = null;

function handlePdfFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.type !== "application/pdf") {
    alert("Please select a PDF file.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (evt) => {
    pendingPdfDataUri = evt.target.result;
    const sizeKb = Math.round(file.size / 1024);
    document.getElementById("pdf-status").textContent =
      `Selected: ${file.name} (${sizeKb} KB) — click "Upload PDF" to save`;
    document.getElementById("pdf-status").style.display = "inline";
  };
  reader.onerror = function () {
    console.error("FileReader failed to read the selected PDF.");
  };
  reader.readAsDataURL(file);
}

function replacePdf() {
  pendingPdfDataUri = null;
  document.getElementById("pdf-status").style.display = "none";
  document.getElementById("pdf-replace-btn").style.display = "none";
  document.getElementById("pdf-file-input").value = "";
  document.getElementById("pdf-file-input").style.display = "block";
  document.getElementById("pdf-file-input").click();
}

// -------------------------------------------------------------
// PDF UPLOAD — dedicated save button
// -------------------------------------------------------------
async function handleUploadPdf() {
  if (!pendingPdfDataUri) {
    alert("Please select a PDF file first.");
    return;
  }

  // Fetch current config to preserve existing event_name, venue, start_time
  try {
    const confRes = await fetch("/api/admin/config", {
      headers: { "x-admin-password": adminPassword },
    });
    if (!confRes.ok) {
      alert("Failed to load current config. Please refresh the page.");
      return;
    }
    const currentConfig = await confRes.json();
    if (!currentConfig) {
      alert("No event configuration found. Please set up the event first.");
      return;
    }

    const body = {
      event_name: currentConfig.event_name,
      venue: currentConfig.venue,
      start_time: currentConfig.start_time,
      program_pdf: pendingPdfDataUri,
    };

    const response = await fetch("/api/admin/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": adminPassword,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      alert("PDF uploaded successfully!");
      pendingPdfDataUri = null;
      // Refresh to show updated status
      const refreshRes = await fetch("/api/admin/config", {
        headers: { "x-admin-password": adminPassword },
      });
      const data = await refreshRes.json();
      loadConfigFields(data);
    } else {
      const errData = await response.json();
      alert(`Error: ${errData.error}`);
    }
  } catch (err) {
    alert(`Failed to upload PDF: ${err.message}`);
  }
}

// -------------------------------------------------------------
// EVENT STORY — dedicated save button
// -------------------------------------------------------------
async function handleSaveEventStory() {
  const celebrants = collectCelebrantsData();
  const schedule = collectScheduleData();

  // Fetch current config to preserve existing event_name, venue, start_time
  try {
    const confRes = await fetch("/api/admin/config", {
      headers: { "x-admin-password": adminPassword },
    });
    if (!confRes.ok) {
      alert("Failed to load current config. Please refresh the page.");
      return;
    }
    const currentConfig = await confRes.json();
    if (!currentConfig) {
      alert("No event configuration found. Please set up the event first.");
      return;
    }

    const body = {
      event_name: currentConfig.event_name,
      venue: currentConfig.venue,
      start_time: currentConfig.start_time,
      celebrants,
      schedule,
    };

    const response = await fetch("/api/admin/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": adminPassword,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      alert("Event Story saved successfully!");
      // Refresh to show updated data
      const refreshRes = await fetch("/api/admin/config", {
        headers: { "x-admin-password": adminPassword },
      });
      const data = await refreshRes.json();
      loadConfigFields(data);
    } else {
      const errData = await response.json();
      alert(`Error: ${errData.error}`);
    }
  } catch (err) {
    alert(`Failed to save Event Story: ${err.message}`);
  }
}

// -------------------------------------------------------------
// QR CODE GENERATION
// -------------------------------------------------------------
let cachedPublicUrl = null;

async function getPublicUrl() {
  if (cachedPublicUrl) return cachedPublicUrl;
  try {
    const res = await fetch("/api/config/public-url");
    const data = await res.json();
    cachedPublicUrl = data.publicUrl;
    return cachedPublicUrl;
  } catch {
    // Fallback to window location
    cachedPublicUrl = window.location.origin;
    return cachedPublicUrl;
  }
}

async function generateQrCode() {
  const qrContainer = document.getElementById("qr-code-display");
  const baseUrl = await getPublicUrl();
  const downloadPageUrl = baseUrl + "/download.html";

  // Clear previous QR
  qrContainer.innerHTML = "";

  // Generate QR using the local qrcode.min.js library
  new QRCode(qrContainer, {
    text: downloadPageUrl,
    width: 200,
    height: 200,
    colorDark: "#ffffff",
    colorLight: "transparent",
    correctLevel: QRCode.CorrectLevel.H,
  });

  // Show download info
  document.getElementById("qr-info").textContent =
    "Scan this QR code to access the birthday download page";
  document.getElementById("qr-info").style.display = "block";
}

// -------------------------------------------------------------
// EVENT STORY — CELEBRANTS & SCHEDULE
// -------------------------------------------------------------
let celebrantCount = 0;
let scheduleCount = 0;

function loadEventStoryFields(config) {
  const celebrants = config.celebrants || [];
  const schedule = config.schedule || [];

  // Render celebrants
  const container = document.getElementById("celebrants-container");
  container.innerHTML = "";
  celebrantCount = 0;
  celebrants.forEach((c) => addCelebrantEntry(c));

  // Render schedule
  const sContainer = document.getElementById("schedule-container");
  sContainer.innerHTML = "";
  scheduleCount = 0;
  schedule.forEach((s) => addScheduleEntry(s));
}

function addCelebrantEntry(data) {
  if (celebrantCount >= 10) {
    document.getElementById("celebrant-limit-msg").style.display = "block";
    document.getElementById("add-celebrant-btn").style.display = "none";
    return;
  }

  const idx = celebrantCount;
  const container = document.getElementById("celebrants-container");
  const div = document.createElement("div");
  div.className = "celebrant-entry";
  div.id = `celebrant-entry-${idx}`;

  const name = data ? escapeHTML(data.name) : "";
  const role = data ? escapeHTML(data.role) : "";
  const photo = data ? data.photo : "";

  div.innerHTML = `
    <input type="file" accept="image/jpeg,image/png,image/webp" class="photo-file-input" id="celebrant-photo-input-${idx}">
    ${
      photo
        ? `<img class="celebrant-photo-preview" id="celebrant-photo-preview-${idx}" src="${escapeHTML(photo)}" alt="Photo">`
        : `<div class="celebrant-photo-placeholder" id="celebrant-photo-placeholder-${idx}">Click to<br>add photo</div>`
    }
    <div class="celebrant-fields">
      <input type="text" class="form-control" placeholder="Full name" id="celebrant-name-${idx}" value="${name}" style="font-size: 0.9rem;">
      <input type="text" class="form-control" placeholder="Role (e.g. Celebrant)" id="celebrant-role-${idx}" value="${role}" style="font-size: 0.9rem;">
    </div>
    <button type="button" class="celebrant-remove" id="celebrant-remove-${idx}" title="Remove celebrant">&times;</button>
  `;

  // Attach event listeners after DOM insertion for reliability
  const fileInput = div.querySelector(`#celebrant-photo-input-${idx}`);
  if (fileInput) {
    fileInput.addEventListener("change", function () {
      handleCelebrantPhoto(this.files[0], idx);
    });
  }

  const placeholderDiv = div.querySelector(
    `#celebrant-photo-placeholder-${idx}`,
  );
  if (placeholderDiv) {
    placeholderDiv.addEventListener("click", function () {
      const input = document.getElementById(`celebrant-photo-input-${idx}`);
      if (input) input.click();
    });
    placeholderDiv.style.cursor = "pointer";
  }

  const removeBtn = div.querySelector(`#celebrant-remove-${idx}`);
  if (removeBtn) {
    removeBtn.addEventListener("click", function () {
      removeCelebrantEntry(idx);
    });
  }

  container.appendChild(div);
  celebrantCount++;
}

function handleCelebrantPhoto(file, idx) {
  if (!file) return;

  // Validate file type
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    alert("Please select a JPEG, PNG, or WebP image.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUri = e.target.result;

    // Store the data URI on the input element for later collection
    const input = document.getElementById(`celebrant-photo-input-${idx}`);
    if (input) {
      input.dataset.base64 = dataUri;
    }

    // Replace placeholder with preview image using DOM methods (not outerHTML)
    const placeholder = document.getElementById(
      `celebrant-photo-placeholder-${idx}`,
    );
    const existingImg = document.getElementById(
      `celebrant-photo-preview-${idx}`,
    );

    if (placeholder && placeholder.parentNode) {
      const img = document.createElement("img");
      img.className = "celebrant-photo-preview";
      img.id = `celebrant-photo-preview-${idx}`;
      img.src = dataUri;
      img.alt = "Photo";
      placeholder.parentNode.replaceChild(img, placeholder);
    } else if (existingImg) {
      existingImg.src = dataUri;
    }
  };
  reader.onerror = function () {
    console.error("FileReader failed to read the selected image.");
  };
  reader.readAsDataURL(file);
}

function removeCelebrantEntry(idx) {
  const entry = document.getElementById(`celebrant-entry-${idx}`);
  if (entry) {
    entry.remove();
    celebrantCount--;
    // Re-enable add button if under limit
    if (celebrantCount < 10) {
      const limitMsg = document.getElementById("celebrant-limit-msg");
      const addBtn = document.getElementById("add-celebrant-btn");
      if (limitMsg) limitMsg.style.display = "none";
      if (addBtn) addBtn.style.display = "";
    }
  }
}

function addScheduleEntry(data) {
  const idx = scheduleCount;
  const container = document.getElementById("schedule-container");
  const div = document.createElement("div");
  div.className = "schedule-entry";
  div.id = `schedule-entry-${idx}`;

  const time = data ? escapeHTML(data.time) : "";
  const title = data ? escapeHTML(data.title) : "";
  const description = data ? escapeHTML(data.description || "") : "";

  div.innerHTML = `
    <div class="schedule-move">
      <button type="button" onclick="moveScheduleItem(${idx}, -1)" title="Move up">&uarr;</button>
      <button type="button" onclick="moveScheduleItem(${idx}, 1)" title="Move down">&darr;</button>
    </div>
    <input type="text" class="form-control schedule-time-input" placeholder="16:00" id="schedule-time-${idx}" value="${time}">
    <div class="schedule-fields">
      <input type="text" class="form-control" placeholder="Title" id="schedule-title-${idx}" value="${title}" style="font-size: 0.9rem;">
      <textarea class="form-control" placeholder="Description (optional)" id="schedule-desc-${idx}" rows="2" style="font-size: 0.85rem; resize: vertical;">${description}</textarea>
    </div>
    <button type="button" class="schedule-remove" onclick="removeScheduleEntry(${idx})" title="Remove item">&times;</button>
  `;

  container.appendChild(div);
  scheduleCount++;
}

function removeScheduleEntry(idx) {
  const entry = document.getElementById(`schedule-entry-${idx}`);
  if (entry) {
    entry.remove();
    scheduleCount--;
  }
}

function moveScheduleItem(idx, direction) {
  const entry = document.getElementById(`schedule-entry-${idx}`);
  if (!entry) return;

  const container = document.getElementById("schedule-container");
  const siblings = Array.from(container.children);
  const currentPos = siblings.indexOf(entry);
  const newPos = currentPos + direction;

  if (newPos < 0 || newPos >= siblings.length) return;

  if (direction === -1) {
    container.insertBefore(entry, siblings[newPos]);
  } else {
    container.insertBefore(entry, siblings[newPos + 1]);
  }
}

function collectCelebrantsData() {
  const celebrants = [];
  const entries = document.querySelectorAll(".celebrant-entry");
  entries.forEach((entry) => {
    // Find inputs within this entry using DOM traversal (not index-based)
    const fileInput = entry.querySelector('input[type="file"]');
    const nameInput = entry.querySelector('input[id^="celebrant-name-"]');
    const roleInput = entry.querySelector('input[id^="celebrant-role-"]');
    const img = entry.querySelector('img[id^="celebrant-photo-preview-"]');

    if (!nameInput || !roleInput) return;
    const nameVal = nameInput.value.trim();
    const roleVal = roleInput.value.trim();
    if (!nameVal || !roleVal) return;

    // Get photo: first check data attribute on file input, then img src
    let photo = "";
    if (fileInput && fileInput.dataset.base64) {
      photo = fileInput.dataset.base64;
    } else if (img && img.src && img.src.startsWith("data:image/")) {
      photo = img.src;
    }

    celebrants.push({ name: nameVal, role: roleVal, photo });
  });
  return celebrants;
}

function collectScheduleData() {
  const schedule = [];
  const entries = document.querySelectorAll(".schedule-entry");
  entries.forEach((entry) => {
    const timeInput = entry.querySelector('input[id^="schedule-time-"]');
    const titleInput = entry.querySelector('input[id^="schedule-title-"]');
    const descInput = entry.querySelector('textarea[id^="schedule-desc-"]');

    if (!timeInput || !titleInput) return;
    const timeVal = timeInput.value.trim();
    const titleVal = titleInput.value.trim();
    if (!timeVal || !titleVal) return;

    schedule.push({
      time: timeVal,
      title: titleVal,
      description: descInput ? descInput.value.trim() : "",
    });
  });
  return schedule;
}

async function handleConfigUpdate(e) {
  e.preventDefault();
  const event_name = document.getElementById("config-name").value;
  const venue = document.getElementById("config-venue").value;
  const start_time = document.getElementById("config-time").value;

  // Collect Event Story data
  const celebrants = collectCelebrantsData();
  const schedule = collectScheduleData();

  // Build body
  const body = {
    event_name,
    venue,
    start_time,
    celebrants,
    schedule,
  };

  // Include PDF if one was selected
  if (pendingPdfDataUri) {
    body.program_pdf = pendingPdfDataUri;
  }

  try {
    const response = await fetch("/api/admin/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": adminPassword,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      alert("Configuration updated successfully!");
      // Refresh
      const confResponse = await fetch("/api/admin/config", {
        headers: { "x-admin-password": adminPassword },
      });
      const data = await confResponse.json();
      loadConfigFields(data);
      pendingPdfDataUri = null;
    } else {
      const errData = await response.json();
      alert(`Error: ${errData.error}`);
    }
  } catch (err) {
    alert(`Failed to update config: ${err.message}`);
  }
}

// 4. Reset/Delete Event Configuration
async function handleResetEvent() {
  if (
    !confirm(
      "Are you sure you want to delete ALL event data? This cannot be undone.",
    )
  ) {
    return;
  }
  if (
    !confirm(
      "Really? All celebrant photos, schedule, PDF, and event info will be permanently deleted.",
    )
  ) {
    return;
  }
  try {
    const response = await fetch("/api/admin/config", {
      method: "DELETE",
      headers: { "x-admin-password": adminPassword },
    });
    if (response.ok) {
      alert("Event data has been reset. The page will now reload.");
      location.reload();
    } else {
      const errData = await response.json();
      alert(`Error: ${errData.error}`);
    }
  } catch (err) {
    alert(`Failed to reset event: ${err.message}`);
  }
}

// Helpers
function escapeHTML(str) {
  if (!str) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  };
  return str.replace(/[&<>"']/g, (tag) => map[tag] || tag);
}
