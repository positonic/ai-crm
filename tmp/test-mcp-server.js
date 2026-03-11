#!/usr/bin/env node

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Test the MCP server stdio communication
async function testMCPServer() {
  console.log("Testing MCP Server stdio communication...");

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

  // Test 1: Initialize MCP connection
  console.log("\nTest 1: Initializing MCP connection...");
  const initMessage = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {
        roots: {
          listChanged: true,
        },
        sampling: {},
      },
      clientInfo: {
        name: "test-client",
        version: "1.0.0",
      },
    },
  };

  mcpServer.stdin.write(JSON.stringify(initMessage) + "\n");

  // Wait for response
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test 2: List available tools
  console.log("\nTest 2: Listing available tools...");
  const listToolsMessage = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  };

  mcpServer.stdin.write(JSON.stringify(listToolsMessage) + "\n");

  // Wait for response
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test 3: Test connection tool
  console.log("\nTest 3: Testing connection tool...");
  const testConnectionMessage = {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "test_connection",
      arguments: {},
    },
  };

  mcpServer.stdin.write(JSON.stringify(testConnectionMessage) + "\n");

  // Wait for response
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Close the server
  mcpServer.kill("SIGTERM");

  console.log("\n=== STDOUT Output ===");
  console.log(responseData);

  console.log("\n=== STDERR Output ===");
  console.log(errorData);

  // Parse and analyze responses
  if (responseData) {
    console.log("\n=== Analysis ===");
    const lines = responseData.split("\n").filter((line) => line.trim());
    lines.forEach((line, index) => {
      try {
        const parsed = JSON.parse(line);
        console.log(`Response ${index + 1}:`, JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log(`Non-JSON line ${index + 1}:`, line);
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
testMCPServer()
  .then((result) => {
    console.log("\n=== Test Results ===");
    console.log("Success:", result.success);
    console.log("Has Response Data:", result.responseData.length > 0);
    console.log("Has Error Data:", result.errorData.length > 0);

    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
