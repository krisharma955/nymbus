import assert from "node:assert";

// ----------------------------------------------------------------------------
// 1. UNIT TEST: SseStreamParser
// ----------------------------------------------------------------------------
class SseStreamParser {
  constructor(onEvent) {
    this.onEvent = onEvent;
    this.buffer = "";
    this.currentEventName = "message";
    this.currentDataLines = [];
    this.currentId = undefined;
    this.currentRetry = undefined;
    this.decoder = new TextDecoder("utf-8", { fatal: false });
  }

  feed(chunk) {
    const text = this.decoder.decode(chunk, { stream: true });
    this.processText(text);
  }

  finish() {
    const text = this.decoder.decode();
    if (text) {
      this.processText(text);
    }
    if (this.buffer.length > 0) {
      this.processLine(this.buffer);
      this.buffer = "";
    }
    this.dispatchEventIfReady();
  }

  processText(text) {
    this.buffer += text;
    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf("\n")) !== -1) {
      let line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) {
        line = line.slice(0, -1);
      }
      this.processLine(line);
    }
  }

  processLine(line) {
    if (line === "") {
      this.dispatchEventIfReady();
      return;
    }
    if (line.startsWith(":")) return;

    let field = line;
    let value = "";
    const colonIndex = line.indexOf(":");
    if (colonIndex !== -1) {
      field = line.slice(0, colonIndex);
      value = line.slice(colonIndex + 1);
      if (value.startsWith(" ")) {
        value = value.slice(1);
      }
    }

    switch (field) {
      case "event":
        this.currentEventName = value;
        break;
      case "data":
        this.currentDataLines.push(value);
        break;
      case "id":
        this.currentId = value;
        break;
      case "retry": {
        const parsed = parseInt(value, 10);
        if (!isNaN(parsed)) this.currentRetry = parsed;
        break;
      }
    }
  }

  dispatchEventIfReady() {
    if (this.currentDataLines.length > 0 || this.currentEventName !== "message") {
      const payload = {
        event: this.currentEventName || "message",
        data: this.currentDataLines.join("\n"),
        id: this.currentId,
        retry: this.currentRetry,
      };
      this.onEvent(payload);
      this.currentEventName = "message";
      this.currentDataLines = [];
      this.currentId = undefined;
      this.currentRetry = undefined;
    }
  }
}

async function testSseParserUnit() {
  console.log("=== RUNNING SSE PARSER TESTS ===");
  const events = [];
  const parser = new SseStreamParser((evt) => events.push(evt));

  // Test 1: Simple event with CRLF
  parser.feed(new TextEncoder().encode("event: CONNECTED\r\ndata: {\"status\":\"CONNECTED\"}\r\n\r\n"));
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].event, "CONNECTED");
  assert.deepStrictEqual(JSON.parse(events[0].data), { status: "CONNECTED" });

  // Test 2: Chunk split across network boundary
  parser.feed(new TextEncoder().encode("event: ASSISTANT_"));
  assert.strictEqual(events.length, 1); // Not finished
  parser.feed(new TextEncoder().encode("DELTA\ndata: {\"con"));
  parser.feed(new TextEncoder().encode("tent\":\"Hello "));
  parser.feed(new TextEncoder().encode("World!\"}\n\n"));
  assert.strictEqual(events.length, 2);
  assert.strictEqual(events[1].event, "ASSISTANT_DELTA");
  assert.deepStrictEqual(JSON.parse(events[1].data), { content: "Hello World!" });

  // Test 3: Multiple events in a single chunk
  const multi = [
    "event: RESEARCH_QUEUED\ndata: {\"status\":\"QUEUED\"}\n\n",
    "event: RESEARCH_PROGRESS\ndata: {\"status\":\"RUNNING\"}\n\n"
  ].join("");
  parser.feed(new TextEncoder().encode(multi));
  assert.strictEqual(events.length, 4);
  assert.strictEqual(events[2].event, "RESEARCH_QUEUED");
  assert.strictEqual(events[3].event, "RESEARCH_PROGRESS");

  // Test 4: Multiline data field
  parser.feed(new TextEncoder().encode("event: DOC\ndata: line 1\ndata: line 2\n\n"));
  assert.strictEqual(events.length, 5);
  assert.strictEqual(events[4].data, "line 1\nline 2");

  // Test 5: Trailing data on finish
  parser.feed(new TextEncoder().encode("event: FINISHED\ndata: trailing"));
  parser.finish();
  assert.strictEqual(events.length, 6);
  assert.strictEqual(events[5].event, "FINISHED");
  assert.strictEqual(events[5].data, "trailing");

  console.log("✓ All SSE Parser Unit Tests Passed!\n");
}

// ----------------------------------------------------------------------------
// 2. INTEGRATION TESTS: Real Backend APIs (http://localhost:8080)
// ----------------------------------------------------------------------------
const BASE_URL = "http://localhost:8080";

async function testBackendIntegration() {
  console.log("=== RUNNING REAL BACKEND INTEGRATION TESTS ===");

  // 1. Auth check
  const meRes = await fetch(`${BASE_URL}/api/me`);
  assert.strictEqual(meRes.ok, true, "GET /api/me should succeed");
  const user = await meRes.json();
  console.log(`✓ Auth OK: User ${user.email} (${user.id})`);

  // 2. List conversations
  const listRes = await fetch(`${BASE_URL}/api/conversations?page=0&size=5`);
  assert.strictEqual(listRes.ok, true, "GET /api/conversations should succeed");
  const listData = await listRes.json();
  console.log(`✓ List Conversations OK: Found ${listData.totalElements} existing conversation(s)`);

  // 3. Create conversation
  const testTitle = `Test Integration Dialogue ${Date.now()}`;
  const createRes = await fetch(`${BASE_URL}/api/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: testTitle })
  });
  assert.strictEqual(createRes.status, 201, "POST /api/conversations should return 201 Created");
  const conv = await createRes.json();
  assert.strictEqual(conv.title, testTitle);
  const convId = conv.id;
  console.log(`✓ Create Conversation OK: Created ID ${convId}`);

  // 4. Update conversation title
  const updatedTitle = `Updated Title ${Date.now()}`;
  const updateRes = await fetch(`${BASE_URL}/api/conversations/${convId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: updatedTitle })
  });
  assert.strictEqual(updateRes.ok, true);
  const updatedConv = await updateRes.json();
  assert.strictEqual(updatedConv.title, updatedTitle);
  console.log(`✓ Update Conversation Title OK: Renamed to "${updatedConv.title}"`);

  // 5. Upload document to conversation
  const testFileContent = "# Fusion Technical Notes\nEmpirical testing of SPARC REBCO magnets achieved 20.1 Tesla flux density.";
  const formData = new FormData();
  formData.append("file", new Blob([testFileContent], { type: "text/markdown" }), "fusion_notes.md");

  const uploadRes = await fetch(`${BASE_URL}/api/conversations/${convId}/documents`, {
    method: "POST",
    body: formData
  });
  assert.strictEqual(uploadRes.status, 201, "POST /api/conversations/{id}/documents should return 201 Created");
  const doc = await uploadRes.json();
  const docId = doc.id;
  console.log(`✓ Upload Document OK: Uploaded "${doc.fileName}" (${doc.fileSizeBytes} bytes, status: ${doc.processingStatus})`);

  // 6. Get document status
  const docStatusRes = await fetch(`${BASE_URL}/api/conversations/${convId}/documents/${docId}/status`);
  assert.strictEqual(docStatusRes.ok, true);
  const docStatus = await docStatusRes.json();
  console.log(`✓ Get Document Status OK: Document is ${docStatus.processingStatus}`);

  // 7. Test POST SSE Real-time Chat Streaming
  console.log("-> Testing POST /api/conversations/{id}/messages/stream (Real-time SSE)...");
  const streamEvents = [];
  const streamParser = new SseStreamParser((evt) => streamEvents.push(evt));

  const streamRes = await fetch(`${BASE_URL}/api/conversations/${convId}/messages/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream"
    },
    body: JSON.stringify({
      content: "Explain the central magnetic flux density achieved by REBCO superconducting magnets.",
      documentIds: [docId],
      deepResearch: false
    })
  });

  assert.strictEqual(streamRes.ok, true, "Streaming request must return 200 OK");
  const contentType = streamRes.headers.get("content-type");
  assert.strictEqual(contentType?.includes("text/event-stream"), true, "Content-Type must be text/event-stream");

  const reader = streamRes.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) streamParser.feed(value);
  }
  streamParser.finish();

  console.log(`✓ Stream Complete! Captured ${streamEvents.length} SSE events:`);
  const eventTypes = streamEvents.map(e => e.event);
  console.log(`  Event types received: ${eventTypes.join(", ")}`);

  assert.strictEqual(eventTypes.includes("CONNECTED"), true, "Must receive CONNECTED event");
  assert.strictEqual(eventTypes.includes("USER_MESSAGE_SAVED"), true, "Must receive USER_MESSAGE_SAVED event");
  assert.strictEqual(
    eventTypes.includes("ASSISTANT_MESSAGE_STARTED") || eventTypes.includes("ASSISTANT_STARTED"),
    true,
    "Must receive ASSISTANT_MESSAGE_STARTED event"
  );
  assert.strictEqual(eventTypes.includes("ASSISTANT_DELTA"), true, "Must receive ASSISTANT_DELTA event");
  assert.strictEqual(
    eventTypes.includes("ASSISTANT_MESSAGE_COMPLETED") || eventTypes.includes("ASSISTANT_COMPLETED"),
    true,
    "Must receive ASSISTANT_MESSAGE_COMPLETED event"
  );

  // 8. List messages in conversation
  const msgListRes = await fetch(`${BASE_URL}/api/conversations/${convId}/messages`);
  assert.strictEqual(msgListRes.ok, true);
  const messages = await msgListRes.json();
  console.log(`✓ List Messages OK: Found ${messages.length} persisted messages in conversation`);
  assert.strictEqual(messages.length >= 2, true, "Should have user and assistant messages");

  // 9. Cleanup: Delete test conversation
  const deleteRes = await fetch(`${BASE_URL}/api/conversations/${convId}`, {
    method: "DELETE"
  });
  assert.strictEqual(deleteRes.status, 204, "DELETE /api/conversations/{id} should return 204 No Content");
  console.log(`✓ Delete Conversation OK: Cleaned up test conversation ${convId}`);

  console.log("\n=======================================================");
  console.log("  ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY!  ");
  console.log("=======================================================\n");
}

async function run() {
  await testSseParserUnit();
  await testBackendIntegration();
}

run().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
