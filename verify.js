require("dotenv").config();
const http = require("http");
const { spawn } = require("child_process");
const assert = require("assert");

// Configs for test
const PORT = 3001;
const ADMIN_PASSWORD = "admin123";
const SCANNER_TOKEN = "scansecret123";

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

    // 1. Fetch Public Event Info
    console.log("[TEST] 1. Testing public event information...");
    const publicInfo = await makeRequest("GET", "/api/event/info");
    assert.ok(publicInfo.event_name, "Event name should be present");
    assert.ok(publicInfo.venue, "Venue should be present");
    console.log("✅ Public info OK");

    // 2. Fetch config without Auth (Should fail)
    console.log("[TEST] 2. Testing config retrieve unauthorized...");
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

    // 3. Fetch config with Auth (Should succeed)
    console.log("[TEST] 3. Testing config retrieve authorized...");
    const config = await makeRequest("GET", "/api/admin/config", null, {
      "x-admin-password": ADMIN_PASSWORD,
    });
    assert.ok(
      config.max_capacity,
      "Max capacity should be present in admin response",
    );
    console.log("✅ Authorized config retrieve OK");

    // 4. Update configuration
    console.log("[TEST] 4. Testing config update...");
    const updateBody = {
      event_name: "Test Party",
      venue: "Test Venue",
      start_time: "2026-06-01T20:00",
      max_capacity: 2,
      enforce_capacity: true,
    };
    const updateRes = await makeRequest(
      "POST",
      "/api/admin/config",
      updateBody,
      {
        "x-admin-password": ADMIN_PASSWORD,
        "Content-Type": "application/json",
      },
    );
    assert.strictEqual(updateRes.message, "Configuration updated successfully");
    console.log("✅ Config update OK");

    // 5. Add a guest
    console.log("[TEST] 5. Testing register single guest...");
    const guestBody = {
      name: "Alice Smith",
      email: "alice@example.com",
      ticket_tier: "vip",
    };
    const guestRes = await makeRequest("POST", "/api/admin/guests", guestBody, {
      "x-admin-password": ADMIN_PASSWORD,
      "Content-Type": "application/json",
    });
    assert.ok(guestRes.id, "Should return a guest ID");
    assert.ok(guestRes.signature, "Should return signature");
    assert.strictEqual(guestRes.name, "Alice Smith");
    console.log("✅ Guest registration OK");

    const aliceTicket = {
      ticketId: guestRes.id,
      guestName: guestRes.name,
      signature: guestRes.signature,
    };

    // 6. Check-in validation (Valid scan)
    console.log("[TEST] 6. Testing scanner check-in validation...");
    const validateBody = {
      ticketId: aliceTicket.ticketId,
      guestName: aliceTicket.guestName,
      signature: aliceTicket.signature,
      scannerId: "test-scanner",
    };
    const scanRes = await makeRequest(
      "POST",
      "/api/scanner/validate",
      validateBody,
      {
        "x-scanner-token": SCANNER_TOKEN,
        "Content-Type": "application/json",
      },
    );
    assert.strictEqual(scanRes.status, "VALID");
    assert.strictEqual(scanRes.guest.name, "Alice Smith");
    console.log("✅ Scanner check-in OK");

    // 7. Check-in duplicate scan (Should block)
    console.log("[TEST] 7. Testing duplicate check-in block...");
    const dupRes = await makeRequest(
      "POST",
      "/api/scanner/validate",
      validateBody,
      {
        "x-scanner-token": SCANNER_TOKEN,
        "Content-Type": "application/json",
      },
    );
    assert.strictEqual(dupRes.status, "DUPLICATE");
    assert.ok(dupRes.error.includes("already been scanned"));
    console.log("✅ Duplicate check-in blocked OK");

    // 8. Counterfeit validation test (Tampered payload)
    console.log("[TEST] 8. Testing counterfeit/tampered signature block...");
    const tamperedBody = {
      ...validateBody,
      guestName: "Bob Tampered",
    };
    try {
      await makeRequest("POST", "/api/scanner/validate", tamperedBody, {
        "x-scanner-token": SCANNER_TOKEN,
        "Content-Type": "application/json",
      });
      assert.fail("Should have blocked tampered name");
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.strictEqual(err.body.status, "INVALID_SIGNATURE");
      console.log("✅ Counterfeit signature blocked OK");
    }

    // 9. Capacity check-in enforcement test
    // Add Bob and Charlie (Total guests: 3, capacity: 2)
    console.log("[TEST] 9. Testing capacity overflow check...");
    const guestBob = await makeRequest(
      "POST",
      "/api/admin/guests",
      {
        name: "Bob Jones",
        email: "bob@example.com",
      },
      {
        "x-admin-password": ADMIN_PASSWORD,
        "Content-Type": "application/json",
      },
    );

    const guestCharlie = await makeRequest(
      "POST",
      "/api/admin/guests",
      {
        name: "Charlie Brown",
        email: "charlie@example.com",
      },
      {
        "x-admin-password": ADMIN_PASSWORD,
        "Content-Type": "application/json",
      },
    );

    // Check-in Bob (Should succeed since total checked-in will be 2)
    const scanBob = await makeRequest(
      "POST",
      "/api/scanner/validate",
      {
        ticketId: guestBob.id,
        guestName: guestBob.name,
        signature: guestBob.signature,
        scannerId: "test-scanner",
      },
      { "x-scanner-token": SCANNER_TOKEN, "Content-Type": "application/json" },
    );
    assert.strictEqual(scanBob.status, "VALID");

    // Check-in Charlie (Should be blocked due to capacity limit of 2)
    const scanCharlie = await makeRequest(
      "POST",
      "/api/scanner/validate",
      {
        ticketId: guestCharlie.id,
        guestName: guestCharlie.name,
        signature: guestCharlie.signature,
        scannerId: "test-scanner",
      },
      { "x-scanner-token": SCANNER_TOKEN, "Content-Type": "application/json" },
    );
    assert.strictEqual(scanCharlie.status, "CAPACITY_EXCEEDED");
    assert.ok(scanCharlie.error.includes("reached maximum capacity"));
    console.log("✅ Capacity gate check-in limits enforced OK");

    // Bump capacity for remaining tests so edit guest can be scanned
    await makeRequest(
      "POST",
      "/api/admin/config",
      {
        event_name: "Test Party",
        venue: "Test Venue",
        start_time: "2026-06-01T20:00",
        max_capacity: 10,
        enforce_capacity: true,
      },
      {
        "x-admin-password": ADMIN_PASSWORD,
        "Content-Type": "application/json",
      },
    );

    // 10. Guest Edit Test — create a fresh guest, edit name, verify new signature
    console.log("[TEST] 10. Testing guest edit endpoint...");
    const editGuest = await makeRequest(
      "POST",
      "/api/admin/guests",
      {
        name: "Diana EditTest",
        email: "diana@example.com",
        ticket_tier: "vip",
      },
      {
        "x-admin-password": ADMIN_PASSWORD,
        "Content-Type": "application/json",
      },
    );
    assert.ok(editGuest.id, "Edit test guest should be created");
    const oldSignature = editGuest.signature;

    const editRes = await makeRequest(
      "PUT",
      `/api/admin/guests/${editGuest.id}`,
      {
        name: "Diana EditTest-Edited",
        email: "diana@example.com",
        ticket_tier: "vip",
      },
      {
        "x-admin-password": ADMIN_PASSWORD,
        "Content-Type": "application/json",
      },
    );
    assert.ok(editRes.signature, "Edit should return new signature");
    assert.ok(
      editRes.signature !== oldSignature,
      "Signature should change after name edit",
    );
    assert.strictEqual(editRes.name, "Diana EditTest-Edited");
    console.log("✅ Guest edit returned new signature OK");

    // 11. Scan with new signature — should succeed
    console.log("[TEST] 11. Testing scan with new signature after edit...");
    const newScanRes = await makeRequest(
      "POST",
      "/api/scanner/validate",
      {
        ticketId: editGuest.id,
        guestName: "Diana EditTest-Edited",
        signature: editRes.signature,
        scannerId: "test-scanner",
      },
      { "x-scanner-token": SCANNER_TOKEN, "Content-Type": "application/json" },
    );
    assert.strictEqual(newScanRes.status, "VALID");
    assert.strictEqual(newScanRes.guest.name, "Diana EditTest-Edited");
    console.log("✅ New signature scan OK");

    // 12. Scan with old signature — should fail as INVALID_SIGNATURE
    console.log("[TEST] 12. Testing old signature rejected after edit...");
    try {
      await makeRequest(
        "POST",
        "/api/scanner/validate",
        {
          ticketId: editGuest.id,
          guestName: "Diana EditTest",
          signature: oldSignature,
          scannerId: "test-scanner",
        },
        {
          "x-scanner-token": SCANNER_TOKEN,
          "Content-Type": "application/json",
        },
      );
      assert.fail("Should have blocked old signature");
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.strictEqual(err.body.status, "INVALID_SIGNATURE");
      console.log("✅ Old signature rejected OK");
    }

    // 13. Edit email to duplicate — should fail with 400
    console.log("[TEST] 13. Testing duplicate email enforcement on edit...");
    try {
      await makeRequest(
        "PUT",
        `/api/admin/guests/${editGuest.id}`,
        {
          name: "Diana EditTest-Edited",
          email: "bob@example.com",
          ticket_tier: "vip",
        },
        {
          "x-admin-password": ADMIN_PASSWORD,
          "Content-Type": "application/json",
        },
      );
      assert.fail("Should have rejected duplicate email");
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.ok(
        err.body.error.toLowerCase().includes("email") ||
          err.body.error.toLowerCase().includes("exists"),
      );
      console.log("✅ Duplicate email on edit blocked OK");
    }

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

// Helper function to execute HTTP requests using built-in node libraries
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

function cleanUpAndExit(code) {
  console.log("[TEST] Stopping test server process...");
  serverProcess.kill();
  process.exit(code);
}
