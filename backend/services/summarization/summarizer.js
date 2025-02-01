const { spawn } = require("child_process");

function startPythonProcess() {
    console.log("🚀 Starting Python summarization process...");
    const process = spawn("python3", ["services/summarization/summarizer.py"], {
        stdio: ["pipe", "pipe", "pipe"], // ✅ Ensure proper I/O handling
    });

    process.stderr.on("data", (error) => {
        console.error("❌ Python Process Crash:", error.toString());
    });

    process.on("exit", (code, signal) => {
        console.error(`❌ Python process exited with code ${code} and signal ${signal}`);
    });

    return process;
}

let pythonProcess = startPythonProcess();
let pendingRequests = [];
let outputBuffer = "";

// ✅ FIX: Only process valid responses
pythonProcess.stdout.on("data", (data) => {
    outputBuffer += data.toString();

    if (outputBuffer.trim().endsWith("]")) { // ✅ Ensure we received a complete JSON response
        try {
            const parsedData = JSON.parse(outputBuffer);
            // console.log("✅ Parsed Summarization Response:", parsedData); // Debugging output

            if (pendingRequests.length > 0) {
                let request = pendingRequests.shift();
                clearTimeout(request.timeout);
                request.resolve(parsedData);
            }
            outputBuffer = ""; // ✅ Reset buffer
        } catch (e) {
            console.error("❌ Error parsing summarization response:", e);
            outputBuffer = ""; // ✅ Reset buffer on failure
        }
    }
});

// ✅ FIX: Prevent endless empty input errors
exports.summarizeBatch = (articles) => {
    return new Promise((resolve, reject) => {
        let timeout = setTimeout(() => {
            console.error("❌ Summarization timeout");
            reject("Summarization timeout.");
            pendingRequests = pendingRequests.filter((r) => r.resolve !== resolve);
        }, 10000); // 10 seconds timeout

        pendingRequests.push({ resolve, reject, timeout });

        // console.log("📤 Sending request to Python:", JSON.stringify(articles)); // Debugging output

        // ✅ FIX: Ensure no extra blank lines are sent
        pythonProcess.stdin.write(JSON.stringify(articles) + "\n", "utf-8", (err) => {
            if (err) console.error("❌ Error writing to Python process:", err);
        });
    });
};