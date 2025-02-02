const { spawn } = require("child_process");

function startPythonProcess() {
    console.log("🚀 Starting Python summarization process...");
    
    const process = spawn("python3", ["services/summarization/summarizer.py"], {
        stdio: ["pipe", "pipe", "pipe"],
    });

    process.stderr.on("data", (error) => {
        const errorMsg = error.toString().trim();
    
        // ✅ Ignore the harmless "Device set to use cpu" message
        if (errorMsg.includes("Device set to use cpu")) return;
    
        // ✅ Ignore the harmless "Device set to use mps" message
        if (errorMsg.includes("Device set to use mps")) return;

        console.error("❌ Python Process Error:", errorMsg);
    });

    process.on("exit", (code, signal) => {
        console.error(`❌ Python process exited with code ${code} and signal ${signal}`);
    });

    return process;
}

let pythonProcess = startPythonProcess();
let pendingRequests = [];
let outputBuffer = "";

pythonProcess.stdout.on("data", (data) => {
    outputBuffer += data.toString();

    if (outputBuffer.trim().endsWith("]")) { 
        try {
            const parsedData = JSON.parse(outputBuffer);
            // console.log("✅ Parsed Summarization Response:", parsedData); // ✅ Log response
            
            if (pendingRequests.length > 0) {
                let request = pendingRequests.shift();
                clearTimeout(request.timeout);
                request.resolve(parsedData);
            }
            outputBuffer = ""; 
        } catch (e) {
            console.error("❌ Error parsing summarization response:", e);
            outputBuffer = "";
        }
    }
});

// ✅ ADD LOGS HERE: Print what Node.js is sending to Python
exports.summarizeBatch = (articles) => {
    return new Promise((resolve, reject) => {
        let timeout = setTimeout(() => {
            console.error("❌ Summarization timeout");
            reject("Summarization timeout.");
            pendingRequests = pendingRequests.filter((r) => r.resolve !== resolve);
        }, 20000); 

        pendingRequests.push({ resolve, reject, timeout });

        //console.log("📤 Sending request to Python:", JSON.stringify(articles)); // ✅ Log request

        pythonProcess.stdin.write(JSON.stringify(articles) + "\n", "utf-8", (err) => {
            if (err) console.error("❌ Error writing to Python process:", err);
        });
    });
};