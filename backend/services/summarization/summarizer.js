import { spawn } from "child_process";

// Start the Python process
function startPythonProcess() {
  console.log("🚀 Starting Python summarization process...");

  // Run the Python script with Python 3
  const process = spawn("python3", ["services/summarization/summarizer.py"], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Filter out harmless device logs
  process.stderr.on("data", (error) => {
    const errorMsg = error.toString().trim();
    if (
      errorMsg.includes("Device set to use cpu") ||
      errorMsg.includes("Device set to use mps") ||
      errorMsg.includes("No GPU found") // your Python script might log this
    ) {
      return;
    }
    console.error("❌ Summarization Error:", errorMsg);
  });

  process.on("exit", (code, signal) => {
    console.error(`❌ Python process exited with code ${code} and signal ${signal}`);
    // Optionally respawn (uncomment if desired):
    // pythonProcess = startPythonProcess();
  });

  return process;
}

let pythonProcess = startPythonProcess();
let pendingRequests = [];
let outputBuffer = "";

// If you want to handle multiple JSON lines per data chunk:
pythonProcess.stdout.on("data", (data) => {
  outputBuffer += data.toString();
  // Split on newline to handle multiple responses or partial lines
  const lines = outputBuffer.split("\n");
  // Keep the last partial line in outputBuffer
  outputBuffer = lines.pop();

  // Process each completed line
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue; // skip empty lines

    try {
      const parsedData = JSON.parse(trimmedLine);
      // Resolve the oldest pending request
      if (pendingRequests.length > 0) {
        let request = pendingRequests.shift();
        clearTimeout(request.timeout);
        request.resolve(parsedData);
      } else {
        console.error("⚠️ No pendingRequests to match this response:", parsedData);
      }
    } catch (e) {
      console.error("❌ Error parsing summarization response:", e);
    }
  }
});

// Export a function to summarize a batch of articles
export function summarizeBatch(articles) {
  return new Promise((resolve, reject) => {
    // 20-second timeout
    const timeout = setTimeout(() => {
      console.error("❌ Summarization timeout");
      reject("Summarization timeout.");
      // Remove from pendingRequests if it's still there
      pendingRequests = pendingRequests.filter((r) => r.resolve !== resolve);
    }, 20000);

    // Add our request to the queue
    pendingRequests.push({ resolve, reject, timeout });

    // Write JSON array of articles to Python's stdin (each line is a separate request)
    // If your Python script uses line-based reading, sending them on separate lines is good
    pythonProcess.stdin.write(JSON.stringify(articles) + "\n", "utf-8", (err) => {
      if (err) {
        console.error("❌ Error writing to Python process:", err);
      }
    });
  });
}