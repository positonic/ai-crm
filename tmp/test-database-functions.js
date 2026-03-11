#!/usr/bin/env node

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Test the MCP server database functions
async function testDatabaseFunctions() {
  console.log("Testing MCP Server database functions...");

  // Start the MCP server
  const mcpServer = spawn("bun", ["scripts/mastra-mcp-server.ts"], {
    cwd: projectRoot,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let responseData = "";
  let errorData = "";

  mcpServer.stdout.on("data", (data) => {
    responseData += data.toString();
  });

  mcpServer.stderr.on("data", (data) => {
    errorData += data.toString();
  });

  // Initialize MCP connection first
  const initMessage = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {
        roots: { listChanged: true },
        sampling: {},
      },
      clientInfo: {
        name: "test-client",
        version: "1.0.0",
      },
    },
  };

  mcpServer.stdin.write(JSON.stringify(initMessage) + "\n");
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Test database functions with dummy eventId
  const testEventId = "test-event-123";

  // Test 1: Get evaluation criteria
  console.log("\nTest 1: Getting evaluation criteria...");
  const getCriteriaMessage = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "get_evaluation_criteria",
      arguments: { eventId: testEventId },
    },
  };

  mcpServer.stdin.write(JSON.stringify(getCriteriaMessage) + "\n");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 2: Get application questions
  console.log("\nTest 2: Getting application questions...");
  const getQuestionsMessage = {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "get_application_questions",
      arguments: { eventId: testEventId },
    },
  };

  mcpServer.stdin.write(JSON.stringify(getQuestionsMessage) + "\n");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 3: Get event applications
  console.log("\nTest 3: Getting event applications...");
  const getApplicationsMessage = {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "get_event_applications",
      arguments: { eventId: testEventId },
    },
  };

  mcpServer.stdin.write(JSON.stringify(getApplicationsMessage) + "\n");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 4: Get event evaluations
  console.log("\nTest 4: Getting event evaluations...");
  const getEvaluationsMessage = {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "get_event_evaluations",
      arguments: { eventId: testEventId },
    },
  };

  mcpServer.stdin.write(JSON.stringify(getEvaluationsMessage) + "\n");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Close the server
  mcpServer.kill("SIGTERM");

  console.log("\n=== Raw Response Data ===");
  console.log(responseData);

  console.log("\n=== Error Data ===");
  console.log(errorData);

  // Parse and analyze responses
  console.log("\n=== Database Function Test Results ===");
  if (responseData) {
    const lines = responseData.split("\n").filter((line) => line.trim());
    lines.forEach((line, index) => {
      try {
        const parsed = JSON.parse(line);
        if (parsed.id && parsed.id > 1) {
          // Skip initialization response
          console.log(`\n--- Response ${parsed.id} ---`);
          if (parsed.result && parsed.result.content) {
            const content = JSON.parse(parsed.result.content[0].text);
            if (content.success === false) {
              console.log("❌ Error:", content.error);
              console.log("Details:", content.details);
            } else {
              console.log("✅ Success - Data received");
              if (content.totalCount !== undefined) {
                console.log("Total items:", content.totalCount);
              }
              if (content.metadata) {
                console.log("Purpose:", content.metadata.purpose);
              }
            }
          }
        }
      } catch (e) {
        // Skip non-JSON lines
      }
    });
  }

  return {
    success: responseData.length > 0,
    responseData,
    errorData,
  };
}

// Run the test
testDatabaseFunctions()
  .then((result) => {
    console.log("\n=== Final Test Summary ===");
    console.log("Test completed successfully:", result.success);
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Database function test failed:", error);
    process.exit(1);
  });
