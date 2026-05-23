const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "../database.sqlite");
const db = new sqlite3.Database(dbPath);

// Promisify database operations
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Database transaction wrapper
const transaction = async (callback) => {
  await run("BEGIN TRANSACTION");
  try {
    const result = await callback();
    await run("COMMIT");
    return result;
  } catch (err) {
    await run("ROLLBACK");
    throw err;
  }
};

// Initialize schema
async function initDb() {
  // 1. Configuration Table (Single Row) — simplified for Birthday Information QR
  await run(`
        CREATE TABLE IF NOT EXISTS event_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_name TEXT NOT NULL,
            venue TEXT NOT NULL,
            start_time TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

  // 2. Add Event Story columns if not present (migration for existing databases)
  const tableInfo = await all("PRAGMA table_info(event_config)");
  const hasCelebrants = tableInfo.some((col) => col.name === "celebrants_json");
  if (!hasCelebrants) {
    await run(
      "ALTER TABLE event_config ADD COLUMN celebrants_json TEXT DEFAULT '[]'",
    );
    await run(
      "ALTER TABLE event_config ADD COLUMN event_schedule_json TEXT DEFAULT '[]'",
    );
  }

  // 3. Add program_pdf column if not present (migration for existing databases)
  const hasProgramPdf = tableInfo.some((col) => col.name === "program_pdf");
  if (!hasProgramPdf) {
    await run(
      "ALTER TABLE event_config ADD COLUMN program_pdf TEXT DEFAULT NULL",
    );
  }

  // 4. Handle legacy columns — drop old tables if they exist (from access-control era)
  await run("DROP TABLE IF EXISTS scan_logs");
  await run("DROP TABLE IF EXISTS guests");

}

module.exports = {
  db,
  run,
  get,
  all,
  transaction,
  initDb,
};
