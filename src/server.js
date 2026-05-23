require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, "../public")));

// Public URL config for QR code generation
// Priority: 1) HOST env var (explicit override), 2) X-Forwarded-Host / Host header (auto-detect)
// On Render, the Host header is automatically set, so this works without manual config.
const PUBLIC_URL = process.env.HOST || null;

// Endpoint to expose the public URL to the frontend
app.get("/api/config/public-url", (req, res) => {
  // Use explicit HOST env var, or auto-detect from request headers
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const publicUrl = PUBLIC_URL || `${protocol}://${host}`;
  res.json({ publicUrl });
});

// ==========================================
// MIDDLEWARES
// ==========================================

// Admin Authentication Middleware
function adminAuth(req, res, next) {
  const password = req.headers["x-admin-password"] || req.query.admin_password;
  if (password === ADMIN_PASSWORD) {
    return next();
  }

  // Check Authorization header (Bearer token style)
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token === ADMIN_PASSWORD) {
      return next();
    }
  }

  res.status(401).json({ error: "Unauthorized: Invalid Admin Password" });
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// Public Event Information (No authentication required)
app.get("/api/event/info", async (req, res) => {
  try {
    const config = await db.get(
      "SELECT event_name, venue, start_time, celebrants_json, event_schedule_json, program_pdf FROM event_config ORDER BY id DESC LIMIT 1",
    );
    if (config) {
      config.celebrants = JSON.parse(config.celebrants_json || "[]");
      config.schedule = JSON.parse(config.event_schedule_json || "[]");
      delete config.celebrants_json;
      delete config.event_schedule_json;
      return res.json(config);
    }
    res.json(null);
  } catch (err) {
    res.status(500).json({
      error: "Failed to retrieve event information",
      details: err.message,
    });
  }
});

// Shared helper: serve the program PDF with a given Content-Disposition type
async function servePdf(res, dispositionType) {
  const config = await db.get(
    "SELECT program_pdf, event_name FROM event_config ORDER BY id DESC LIMIT 1",
  );
  if (!config || !config.program_pdf) {
    return res
      .status(404)
      .json({ error: "No program PDF has been uploaded yet" });
  }

  // Extract base64 data from data URI format: data:application/pdf;base64,<data>
  const matches = config.program_pdf.match(
    /^data:application\/pdf;base64,(.+)$/,
  );
  if (!matches) {
    return res.status(500).json({ error: "Invalid program PDF data format" });
  }

  const pdfBuffer = Buffer.from(matches[1], "base64");
  const safeName = (config.event_name || "birthday-program")
    .replace(/[^a-zA-Z0-9-_\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${dispositionType}; filename="${safeName}.pdf"`,
  );
  res.setHeader("Content-Length", pdfBuffer.length);
  res.send(pdfBuffer);
}

// Public Download Endpoint — returns the birthday program PDF (forces download)
app.get("/api/event/download", async (req, res) => {
  try {
    await servePdf(res, "attachment");
  } catch (err) {
    res.status(500).json({
      error: "Failed to download program PDF",
      details: err.message,
    });
  }
});

// Public PDF View Endpoint — returns the birthday program PDF (inline, for browser viewing)
app.get("/api/event/pdf-view", async (req, res) => {
  try {
    await servePdf(res, "inline");
  } catch (err) {
    res.status(500).json({
      error: "Failed to view program PDF",
      details: err.message,
    });
  }
});

// 1. Get Event Configuration (Admin only)
app.get("/api/admin/config", adminAuth, async (req, res) => {
  try {
    const config = await db.get(
      "SELECT * FROM event_config ORDER BY id DESC LIMIT 1",
    );
    if (config) {
      config.celebrants = JSON.parse(config.celebrants_json || "[]");
      config.schedule = JSON.parse(config.event_schedule_json || "[]");
      delete config.celebrants_json;
      delete config.event_schedule_json;
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({
      error: "Failed to retrieve event configuration",
      details: err.message,
    });
  }
});

// 2. Update Event Configuration (Admin only)
app.post("/api/admin/config", adminAuth, async (req, res) => {
  const { event_name, venue, start_time, celebrants, schedule, program_pdf } =
    req.body;

  if (!event_name || !venue || !start_time) {
    return res.status(400).json({
      error:
        "Missing required configuration fields: event_name, venue, start_time",
    });
  }

  // Validate celebrants if provided
  if (celebrants !== undefined) {
    if (!Array.isArray(celebrants)) {
      return res.status(400).json({ error: "celebrants must be an array" });
    }
    if (celebrants.length > 10) {
      return res.status(400).json({ error: "Maximum 10 celebrants allowed" });
    }
    for (let i = 0; i < celebrants.length; i++) {
      const c = celebrants[i];
      if (!c.name || !c.role || !c.photo) {
        return res.status(400).json({
          error: `Celebrant at index ${i} must have name, role, and photo`,
        });
      }
      if (!c.photo.startsWith("data:image/")) {
        return res.status(400).json({
          error: `Celebrant at index ${i} photo must be a base64 data URI starting with data:image/`,
        });
      }
    }
  }

  // Validate schedule if provided
  if (schedule !== undefined) {
    if (!Array.isArray(schedule)) {
      return res.status(400).json({ error: "schedule must be an array" });
    }
    for (let i = 0; i < schedule.length; i++) {
      const s = schedule[i];
      if (!s.time || !s.title) {
        return res.status(400).json({
          error: `Schedule item at index ${i} must have time and title`,
        });
      }
    }
  }

  // Validate program_pdf if provided (must be null or valid data URI)
  if (program_pdf !== undefined && program_pdf !== null) {
    if (!program_pdf.startsWith("data:application/pdf;base64,")) {
      return res.status(400).json({
        error:
          "program_pdf must be a base64 data URI starting with data:application/pdf;base64,",
      });
    }
  }

  try {
    const celebrantsJson = JSON.stringify(celebrants || []);
    const scheduleJson = JSON.stringify(schedule || []);
    const pdfValue = program_pdf !== undefined ? program_pdf : undefined;

    const latest = await db.get(
      "SELECT id FROM event_config ORDER BY id DESC LIMIT 1",
    );
    if (latest) {
      // Build dynamic UPDATE query based on whether program_pdf was provided
      if (pdfValue !== undefined) {
        await db.run(
          `UPDATE event_config
           SET event_name = ?, venue = ?, start_time = ?,
               celebrants_json = ?, event_schedule_json = ?, program_pdf = ?
           WHERE id = ?`,
          [
            event_name,
            venue,
            start_time,
            celebrantsJson,
            scheduleJson,
            pdfValue,
            latest.id,
          ],
        );
      } else {
        await db.run(
          `UPDATE event_config
           SET event_name = ?, venue = ?, start_time = ?,
               celebrants_json = ?, event_schedule_json = ?
           WHERE id = ?`,
          [
            event_name,
            venue,
            start_time,
            celebrantsJson,
            scheduleJson,
            latest.id,
          ],
        );
      }
    } else {
      if (pdfValue !== undefined) {
        await db.run(
          `INSERT INTO event_config (event_name, venue, start_time, celebrants_json, event_schedule_json, program_pdf)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            event_name,
            venue,
            start_time,
            celebrantsJson,
            scheduleJson,
            pdfValue,
          ],
        );
      } else {
        await db.run(
          `INSERT INTO event_config (event_name, venue, start_time, celebrants_json, event_schedule_json)
           VALUES (?, ?, ?, ?, ?)`,
          [event_name, venue, start_time, celebrantsJson, scheduleJson],
        );
      }
    }
    res.json({ message: "Configuration updated successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update configuration", details: err.message });
  }
});

// 3. Delete/Reset Event Configuration (Admin only)
app.delete("/api/admin/config", adminAuth, async (req, res) => {
  try {
    const result = await db.run("DELETE FROM event_config");
    if (result && result.changes > 0) {
      res.json({ message: "Configuration deleted successfully" });
    } else {
      res.json({ message: "No configuration to delete" });
    }
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete configuration", details: err.message });
  }
});

// Handle fallback SPA routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Start Server
db.initDb()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[QR SCANNER SERVER] Running at http://localhost:${PORT}`);
      console.log(`[QR SCANNER SERVER] Admin Password: ${ADMIN_PASSWORD}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database schema:", err);
    process.exit(1);
  });
