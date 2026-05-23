require("dotenv").config();
const http = require("http");
const { spawn } = require("child_process");
const assert = require("assert");

// Configs for test
const PORT = 3001;
const ADMIN_PASSWORD = "admin123";

console.log("[TEST] Starting verification tests...");

// Spin up a test server instance
const serverProcess = spawn("node", ["src/server.js"], {
  env: { ...process.env, PORT: PORT.toString() },
});

let serverOutput = "";
serverProcess.stdout.on("data", (data) => {
  serverOutput += data.toString();
  console.log(`[SERVER] ${data.toString().trim()}`);
});

serverProcess.stderr.on("data", (data) => {
  console.error(`[SERVER ERROR] ${data.toString().trim()}`);
});

// Wait for server to boot
setTimeout(async () => {
  try {
    console.log("[TEST] Server started. Commencing endpoint tests...");

    // ==========================================
    // TEST 1: Create initial config (empty database)
    // ==========================================
    console.log("[TEST] 1. Creating initial event configuration...");
    const createBody = {
      event_name: "Sarah's 30th Birthday",
      venue: "Skyline Terrace Lounge",
      start_time: "2026-06-01T20:00",
      program_pdf: null,
    };
    const createRes = await makeRequest(
      "POST",
      "/api/admin/config",
      createBody,
      {
        "x-admin-password": ADMIN_PASSWORD,
        "Content-Type": "application/json",
      },
    );
    assert.strictEqual(createRes.message, "Configuration updated successfully");
    console.log("✅ Initial config created OK");

    // ==========================================
    // TEST 2: Public Event Info
    // ==========================================
    console.log("[TEST] 2. Testing public event information...");
    const publicInfo = await makeRequest("GET", "/api/event/info");
    assert.strictEqual(publicInfo.event_name, "Sarah's 30th Birthday");
    assert.strictEqual(publicInfo.venue, "Skyline Terrace Lounge");
    assert.strictEqual(publicInfo.start_time, "2026-06-01T20:00");
    assert.ok(
      Array.isArray(publicInfo.celebrants),
      "celebrants should be an array",
    );
    assert.strictEqual(
      publicInfo.celebrants.length,
      0,
      "celebrants should be empty",
    );
    assert.ok(
      Array.isArray(publicInfo.schedule),
      "schedule should be an array",
    );
    assert.strictEqual(
      publicInfo.schedule.length,
      0,
      "schedule should be empty",
    );
    assert.strictEqual(
      publicInfo.program_pdf,
      null,
      "program_pdf should be null initially",
    );
    console.log("✅ Public info OK");

    // ==========================================
    // TEST 3: Unauthorized config access
    // ==========================================
    console.log("[TEST] 3. Testing config retrieve unauthorized...");
    try {
      await makeRequest("GET", "/api/admin/config");
      assert.fail("Should have failed with 401");
    } catch (err) {
      assert.strictEqual(
        err.statusCode,
        401,
        "Should fail with 401 unauthorized",
      );
      console.log("✅ Unauthorized block OK");
    }

    // ==========================================
    // TEST 4: Authorized config access
    // ==========================================
    console.log("[TEST] 4. Testing config retrieve authorized...");
    const config = await makeRequest("GET", "/api/admin/config", null, {
      "x-admin-password": ADMIN_PASSWORD,
    });
    assert.strictEqual(config.event_name, "Sarah's 30th Birthday");
    assert.strictEqual(config.venue, "Skyline Terrace Lounge");
    assert.strictEqual(config.start_time, "2026-06-01T20:00");
    // max_capacity and enforce_capacity should NOT be present
    assert.strictEqual(
      config.max_capacity,
      undefined,
      "max_capacity should not be present",
    );
    assert.strictEqual(
      config.enforce_capacity,
      undefined,
      "enforce_capacity should not be present",
    );
    // scanner_token should NOT be present
    assert.strictEqual(
      config.scanner_token,
      undefined,
      "scanner_token should not be present",
    );
    // program_pdf should be present (nullable)
    assert.ok("program_pdf" in config, "program_pdf field should be present");
    console.log("✅ Authorized config retrieve OK");

    // ==========================================
    // TEST 5: Update configuration with program_pdf
    // ==========================================
    console.log("[TEST] 5. Testing config update with program_pdf...");
    const pdfBody = {
      event_name: "Sarah's 30th Birthday",
      venue: "Skyline Terrace Lounge",
      start_time: "2026-06-01T20:00",
      program_pdf: "data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYm",
    };
    const pdfUpdateRes = await makeRequest(
      "POST",
      "/api/admin/config",
      pdfBody,
      {
        "x-admin-password": ADMIN_PASSWORD,
        "Content-Type": "application/json",
      },
    );
    assert.strictEqual(
      pdfUpdateRes.message,
      "Configuration updated successfully",
    );
    console.log("✅ Config update with program_pdf OK");

    // Verify program_pdf is returned in public info
    const publicInfoWithPdf = await makeRequest("GET", "/api/event/info");
    assert.ok(
      publicInfoWithPdf.program_pdf,
      "program_pdf should be present in public info",
    );
    assert.strictEqual(
      publicInfoWithPdf.program_pdf,
      "data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYm",
    );
    console.log("✅ Public info returns program_pdf OK");

    // ==========================================
    // TEST 6: Download endpoint returns PDF
    // ==========================================
    console.log("[TEST] 6. Testing download endpoint...");
    const downloadResult = await makeRequestRaw("GET", "/api/event/download");
    assert.strictEqual(
      downloadResult.statusCode,
      200,
      "Download should return 200",
    );
    assert.ok(
      downloadResult.headers["content-type"] === "application/pdf" ||
        downloadResult.headers["content-type"]?.includes("application/pdf"),
      "Content-Type should be application/pdf",
    );
    assert.ok(
      downloadResult.headers["content-disposition"]?.includes("attachment"),
      "Content-Disposition should include attachment",
    );
    assert.ok(
      downloadResult.headers["content-disposition"]?.includes(".pdf"),
      "Content-Disposition should include .pdf filename",
    );
    // The body should be the decoded base64 content
    assert.ok(
      downloadResult.body.length > 0,
      "Download body should not be empty",
    );
    console.log("✅ Download endpoint OK");

    // ==========================================
    // TEST 7: Download endpoint when no PDF configured
    // ==========================================
    console.log("[TEST] 7. Testing download endpoint with no PDF...");
    // Clear the PDF
    await makeRequest(
      "POST",
      "/api/admin/config",
      {
        event_name: "Sarah's 30th Birthday",
        venue: "Skyline Terrace Lounge",
        start_time: "2026-06-01T20:00",
        program_pdf: null,
      },
      {
        "x-admin-password": ADMIN_PASSWORD,
        "Content-Type": "application/json",
      },
    );
    const noPdfResult = await makeRequestRaw("GET", "/api/event/download");
    assert.strictEqual(
      noPdfResult.statusCode,
      404,
      "Download without PDF should return 404",
    );
    assert.ok(
      noPdfResult.body.error || noPdfResult.body.message,
      "Should return error message",
    );
    console.log("✅ Download endpoint with no PDF OK");

    // ==========================================
    // TEST 8: Event Story — configure celebrants + schedule
    // ==========================================
    console.log("[TEST] 8. Testing Event Story config...");
    const storyConfig = await makeRequest(
      "POST",
      "/api/admin/config",
      {
        event_name: "Sarah's 30th Birthday",
        venue: "Skyline Terrace Lounge",
        start_time: "2026-06-01T20:00",
        celebrants: [
          {
            name: "Sarah",
            role: "Celebrant",
            photo: "data:image/jpeg;base64,/9j/4AAQ==",
          },
          {
            name: "Michael",
            role: "Partner",
            photo: "data:image/jpeg;base64,/9j/4AAQ==",
          },
        ],
        schedule: [
          {
            time: "16:00",
            title: "Cocktail Hour",
            description: "Welcome drinks",
          },
          { time: "17:00", title: "Grand Entrance", description: "" },
        ],
      },
      {
        "x-admin-password": ADMIN_PASSWORD,
        "Content-Type": "application/json",
      },
    );
    assert.strictEqual(
      storyConfig.message,
      "Configuration updated successfully",
    );

    // Verify public info returns celebrants + schedule
    const publicInfoWithStory = await makeRequest("GET", "/api/event/info");
    assert.ok(
      Array.isArray(publicInfoWithStory.celebrants),
      "celebrants should be an array",
    );
    assert.strictEqual(
      publicInfoWithStory.celebrants.length,
      2,
      "should have 2 celebrants",
    );
    assert.strictEqual(publicInfoWithStory.celebrants[0].name, "Sarah");
    assert.strictEqual(publicInfoWithStory.celebrants[0].role, "Celebrant");
    assert.ok(
      publicInfoWithStory.celebrants[0].photo.startsWith("data:image/"),
      "photo should be base64 data URI",
    );
    assert.ok(
      Array.isArray(publicInfoWithStory.schedule),
      "schedule should be an array",
    );
    assert.strictEqual(
      publicInfoWithStory.schedule.length,
      2,
      "should have 2 schedule items",
    );
    assert.strictEqual(publicInfoWithStory.schedule[0].time, "16:00");
    assert.strictEqual(publicInfoWithStory.schedule[0].title, "Cocktail Hour");
    console.log("✅ Event Story config OK");

    // ==========================================
    // TEST 9: Event Story — empty defaults
    // ==========================================
    console.log("[TEST] 9. Testing Event Story empty defaults...");
    await makeRequest(
      "POST",
      "/api/admin/config",
      {
        event_name: "Sarah's 30th Birthday",
        venue: "Skyline Terrace Lounge",
        start_time: "2026-06-01T20:00",
      },
      {
        "x-admin-password": ADMIN_PASSWORD,
        "Content-Type": "application/json",
      },
    );
    const publicInfoEmpty = await makeRequest("GET", "/api/event/info");
    assert.ok(
      Array.isArray(publicInfoEmpty.celebrants),
      "celebrants should be an array even when empty",
    );
    assert.strictEqual(
      publicInfoEmpty.celebrants.length,
      0,
      "should be empty array",
    );
    assert.ok(
      Array.isArray(publicInfoEmpty.schedule),
      "schedule should be an array even when empty",
    );
    assert.strictEqual(
      publicInfoEmpty.schedule.length,
      0,
      "should be empty array",
    );
    console.log("✅ Event Story empty defaults OK");

    // ==========================================
    // TEST 10: Event Story — admin config GET
    // ==========================================
    console.log("[TEST] 10. Testing Event Story admin config GET...");
    const adminConfigStory = await makeRequest(
      "GET",
      "/api/admin/config",
      null,
      {
        "x-admin-password": ADMIN_PASSWORD,
      },
    );
    assert.ok(
      Array.isArray(adminConfigStory.celebrants),
      "admin config should have celebrants array",
    );
    assert.strictEqual(
      adminConfigStory.celebrants.length,
      0,
      "celebrants should be empty after reset",
    );
    assert.ok(
      Array.isArray(adminConfigStory.schedule),
      "admin config should have schedule array",
    );
    assert.strictEqual(
      adminConfigStory.schedule.length,
      0,
      "schedule should be empty after reset",
    );
    console.log("✅ Event Story admin config GET OK");

    // ==========================================
    // TEST 11: Event Story — re-configure and verify
    // ==========================================
    console.log("[TEST] 11. Testing Event Story re-configure...");
    const reStory = await makeRequest(
      "POST",
      "/api/admin/config",
      {
        event_name: "Sarah's 30th Birthday",
        venue: "Skyline Terrace Lounge",
        start_time: "2026-06-01T20:00",
        celebrants: [
          {
            name: "Alice",
            role: "Celebrant",
            photo: "data:image/jpeg;base64,/9j/4AAQ==",
          },
          {
            name: "Bob",
            role: "Co-Host",
            photo: "data:image/png;base64,iVBORw0KGgo=",
          },
        ],
        schedule: [
          { time: "18:00", title: "Dinner", description: "Main course" },
          { time: "19:00", title: "Speeches", description: "" },
        ],
      },
      {
        "x-admin-password": ADMIN_PASSWORD,
        "Content-Type": "application/json",
      },
    );
    assert.strictEqual(reStory.message, "Configuration updated successfully");

    const adminConfigRe = await makeRequest("GET", "/api/admin/config", null, {
      "x-admin-password": ADMIN_PASSWORD,
    });
    assert.strictEqual(
      adminConfigRe.celebrants.length,
      2,
      "should have 2 celebrants",
    );
    assert.strictEqual(
      adminConfigRe.celebrants[0].name,
      "Alice",
      "first celebrant name",
    );
    assert.strictEqual(
      adminConfigRe.celebrants[1].role,
      "Co-Host",
      "second celebrant role",
    );
    assert.strictEqual(
      adminConfigRe.schedule.length,
      2,
      "should have 2 schedule items",
    );
    assert.strictEqual(
      adminConfigRe.schedule[0].title,
      "Dinner",
      "first schedule title",
    );
    assert.strictEqual(
      adminConfigRe.schedule[1].time,
      "19:00",
      "second schedule time",
    );
    console.log("✅ Event Story re-configure OK");

    // ==========================================
    // TEST 12: Old scanner endpoints should 404
    // ==========================================
    console.log("[TEST] 12. Testing old scanner endpoints return 404...");
    try {
      await makeRequest("POST", "/api/scanner/validate", {
        ticketId: "fake",
        guestName: "test",
        signature: "fake",
      });
      assert.fail("Should have failed with 404");
    } catch (err) {
      assert.strictEqual(
        err.statusCode,
        404,
        "Old scanner endpoint should return 404",
      );
      console.log("✅ Old scanner endpoints 404 OK");
    }

    // Old guest endpoint should return HTML (catch-all) not JSON guest data
    const oldGuestRes = await makeRequestRaw("GET", "/api/admin/guests", null, {
      "x-admin-password": ADMIN_PASSWORD,
    });
    const contentType = oldGuestRes.headers["content-type"] || "";
    assert.ok(
      contentType.includes("text/html") || typeof oldGuestRes.body === "string",
      "Old guest endpoint should return HTML, not JSON guest data",
    );
    // Verify it's NOT the guest list JSON (which would have a 'guests' array)
    if (typeof oldGuestRes.body === "object" && oldGuestRes.body !== null) {
      assert.strictEqual(
        oldGuestRes.body.guests,
        undefined,
        "Should not contain guest list data",
      );
    }
    console.log("✅ Old guest endpoints properly removed OK");

    // ==========================================
    // TEST 13: Delete/Reset event configuration
    // ==========================================
    console.log("[TEST] 13. Testing delete/reset event configuration...");
    const deleteRes = await makeRequest("DELETE", "/api/admin/config", null, {
      "x-admin-password": ADMIN_PASSWORD,
    });
    assert.ok(
      deleteRes.message && deleteRes.message.includes("deleted"),
      "Should return deletion success message",
    );
    console.log("✅ Delete/reset config OK");

    // Verify public info returns null after deletion
    const afterDelete = await makeRequest("GET", "/api/event/info");
    assert.strictEqual(
      afterDelete,
      null,
      "Public info should be null after deletion",
    );
    console.log("✅ Public info null after deletion OK");

    // Verify unauthorized delete fails
    try {
      await makeRequest("DELETE", "/api/admin/config");
      assert.fail("Should have failed with 401");
    } catch (err) {
      assert.strictEqual(
        err.statusCode,
        401,
        "Should fail with 401 unauthorized",
      );
      console.log("✅ Unauthorized delete blocked OK");
    }

    // ==========================================
    // TEST 14: Inline PDF viewer endpoint (pdf-view)
    // ==========================================
    console.log("[TEST] 14. Testing inline PDF viewer endpoint...");

    // Re-create config with a PDF for pdf-view testing
    await makeRequest(
      "POST",
      "/api/admin/config",
      {
        event_name: "Sarah's 30th Birthday",
        venue: "Skyline Terrace Lounge",
        start_time: "2026-06-01T20:00",
        program_pdf: "data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYm",
      },
      {
        "x-admin-password": ADMIN_PASSWORD,
        "Content-Type": "application/json",
      },
    );

    // Test 14a: pdf-view returns PDF with inline disposition
    const pdfViewResult = await makeRequestRaw("GET", "/api/event/pdf-view");
    assert.strictEqual(
      pdfViewResult.statusCode,
      200,
      "pdf-view should return 200",
    );
    assert.ok(
      pdfViewResult.headers["content-type"] === "application/pdf" ||
        pdfViewResult.headers["content-type"]?.includes("application/pdf"),
      "Content-Type should be application/pdf",
    );
    assert.ok(
      pdfViewResult.headers["content-disposition"]?.includes("inline"),
      "Content-Disposition should include inline",
    );
    assert.ok(
      pdfViewResult.headers["content-disposition"]?.includes(".pdf"),
      "Content-Disposition should include .pdf filename",
    );
    assert.ok(
      pdfViewResult.body.length > 0,
      "pdf-view body should not be empty",
    );
    console.log("✅ pdf-view inline PDF OK");

    // Test 14b: pdf-view returns 404 when no PDF configured
    await makeRequest(
      "POST",
      "/api/admin/config",
      {
        event_name: "Sarah's 30th Birthday",
        venue: "Skyline Terrace Lounge",
        start_time: "2026-06-01T20:00",
        program_pdf: null,
      },
      {
        "x-admin-password": ADMIN_PASSWORD,
        "Content-Type": "application/json",
      },
    );
    const noPdfViewResult = await makeRequestRaw("GET", "/api/event/pdf-view");
    assert.strictEqual(
      noPdfViewResult.statusCode,
      404,
      "pdf-view without PDF should return 404",
    );
    assert.ok(
      noPdfViewResult.body.error || noPdfViewResult.body.message,
      "Should return error message",
    );
    console.log("✅ pdf-view 404 when no PDF OK");

    // Test 14c: Download endpoint still returns attachment disposition
    // Re-add PDF for this test
    await makeRequest(
      "POST",
      "/api/admin/config",
      {
        event_name: "Sarah's 30th Birthday",
        venue: "Skyline Terrace Lounge",
        start_time: "2026-06-01T20:00",
        program_pdf: "data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYm",
      },
      {
        "x-admin-password": ADMIN_PASSWORD,
        "Content-Type": "application/json",
      },
    );
    const downloadStillResult = await makeRequestRaw(
      "GET",
      "/api/event/download",
    );
    assert.strictEqual(
      downloadStillResult.statusCode,
      200,
      "Download should still return 200",
    );
    assert.ok(
      downloadStillResult.headers["content-disposition"]?.includes(
        "attachment",
      ),
      "Download should still have attachment disposition",
    );
    console.log("✅ Download endpoint still works OK");

    // ==========================================
    // TEST 15: Download page HTML contains redesigned UI elements
    // ==========================================
    console.log(
      "[TEST] 15. Testing download page HTML for redesigned UI elements...",
    );

    // Re-create config with celebrants + schedule for full UI test
    await makeRequest(
      "POST",
      "/api/admin/config",
      {
        event_name: "Sarah's 30th Birthday",
        venue: "Skyline Terrace Lounge",
        start_time: "2026-06-01T20:00",
        program_pdf: "data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYm",
        celebrants: [
          {
            name: "Sarah",
            role: "Birthday Girl",
            photo: "data:image/jpeg;base64,/9j/4AAQ==",
          },
          {
            name: "Michael",
            role: "Partner",
            photo: "data:image/jpeg;base64,/9j/4AAQ==",
          },
        ],
        schedule: [
          {
            time: "16:00",
            title: "Cocktail Hour",
            description: "Welcome drinks",
          },
          { time: "17:00", title: "Grand Entrance", description: "" },
        ],
      },
      {
        "x-admin-password": ADMIN_PASSWORD,
        "Content-Type": "application/json",
      },
    );

    // Fetch the download page HTML
    const downloadHtmlResult = await makeRequestRaw("GET", "/download.html");
    assert.strictEqual(
      downloadHtmlResult.statusCode,
      200,
      "Download page should return 200",
    );
    const html =
      typeof downloadHtmlResult.body === "string"
        ? downloadHtmlResult.body
        : "";

    // Test 15a: SVG icons present (no raw emoji for section titles)
    assert.ok(
      html.includes("<svg") || html.includes("svg"),
      "Download page should contain SVG icons",
    );
    assert.ok(
      !html.includes("&#x1F389;") &&
        !html.includes("&#x1F4C5;") &&
        !html.includes("&#x1F4E5;"),
      "Section titles should use SVG icons, not raw emoji",
    );
    console.log("✅ SVG icons present, raw emoji removed OK");

    // Test 15b: Retry button present in error state
    assert.ok(
      html.includes("retry") ||
        html.includes("Retry") ||
        html.includes("Try Again"),
      "Error state should have a retry/try-again button",
    );
    console.log("✅ Retry button present OK");

    // Test 15c: Invitation card metaphor elements present
    assert.ok(
      html.includes("You're Invited") ||
        html.includes("you're invited") ||
        html.includes("You're Invited"),
      "Hero should have invitation header text",
    );
    console.log("✅ Invitation header present OK");

    // Test 15d: Celebrant carousel structure (marquee display)
    assert.ok(
      html.includes("carousel") ||
        html.includes("Carousel") ||
        html.includes("celebrant-carousel") ||
        html.includes("celebrant-frame"),
      "Download page should have celebrant carousel structure",
    );
    console.log("✅ Celebrant carousel structure present OK");

    // Test 15e: Crown badge for birthday person
    assert.ok(
      html.includes("crown") ||
        html.includes("Crown") ||
        html.includes("crown-badge"),
      "Birthday person should have crown badge",
    );
    console.log("✅ Crown badge present OK");

    // Test 15f: Page indicator for PDF viewer
    assert.ok(
      html.includes("page-indicator") ||
        html.includes("page-counter") ||
        html.includes("Page") ||
        html.includes("page"),
      "PDF viewer should have page indicator element",
    );
    console.log("✅ Page indicator present OK");

    // Test 15g: Confetti loading animation
    assert.ok(
      html.includes("confetti") || html.includes("Confetti"),
      "Loading state should have confetti animation",
    );
    console.log("✅ Confetti loading animation present OK");

    // Test 15h: Gold/warm color palette references
    assert.ok(
      html.includes("gold") ||
        html.includes("Gold") ||
        html.includes("#F59E0B") ||
        html.includes("#f59e0b"),
      "Download page should reference gold/warm palette",
    );
    console.log("✅ Warm palette references present OK");

    // Test 15i: Playfair Display font loaded
    assert.ok(
      html.includes("Playfair") || html.includes("playfair"),
      "Playfair Display font should be loaded",
    );
    console.log("✅ Playfair Display font loaded OK");

    console.log("✅ All download page UI redesign elements verified OK");

    console.log(
      "\n🌟 ALL ENDPOINT VERIFICATION TESTS COMPLETED SUCCESSFULLY! 🌟\n",
    );
    cleanUpAndExit(0);
  } catch (err) {
    console.error("\n❌ VERIFICATION TEST FAILED! ❌");
    console.error(err);
    cleanUpAndExit(1);
  }
}, 2000);

// Helper: HTTP request returning parsed JSON
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: PORT,
      path: path,
      method: method,
      headers: headers,
    };

    let requestBodyString = "";
    if (body) {
      requestBodyString = JSON.stringify(body);
      options.headers["Content-Length"] = Buffer.byteLength(requestBodyString);
    }

    const req = http.request(options, (res) => {
      let resData = "";
      res.on("data", (chunk) => {
        resData += chunk;
      });

      res.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(resData);
        } catch (e) {
          parsed = resData;
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed);
        } else {
          reject({
            statusCode: res.statusCode,
            body: parsed,
          });
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (body) {
      req.write(requestBodyString);
    }
    req.end();
  });
}

// Helper: HTTP request returning raw response (for download endpoint testing)
function makeRequestRaw(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: PORT,
      path: path,
      method: method,
      headers: headers,
    };

    let requestBodyString = "";
    if (body) {
      requestBodyString = JSON.stringify(body);
      options.headers["Content-Length"] = Buffer.byteLength(requestBodyString);
    }

    const req = http.request(options, (res) => {
      let resData = "";
      res.on("data", (chunk) => {
        resData += chunk;
      });

      res.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(resData);
        } catch (e) {
          parsed = resData;
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (body) {
      req.write(requestBodyString);
    }
    req.end();
  });
}

function cleanUpAndExit(code) {
  console.log("[TEST] Stopping test server process...");
  serverProcess.kill();
  process.exit(code);
}
