const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

const intervalInSeconds = 120;
const piUrl = "https://api.example.com/second"; // Replace it with http api trigger of your client lambda
const AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

function log(...args) {
    console.log(new Date().toISOString(), ...args);
}

async function sendHeartbeatAndProcess() {
    try {
        const heartbeatPayload = { status: "heartbeat" };
        const heartbeatResponse = await axios.post(piUrl, heartbeatPayload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': AUTH_TOKEN,
            },
            validateStatus: () => true
        });

        if (heartbeatResponse.status === 200 && heartbeatResponse.data) {
            // Expecting { name: 'iire' } or just 'iire'
            const data = typeof heartbeatResponse.data === "string"
            ? JSON.parse(heartbeatResponse.data)
            : heartbeatResponse.data;

            let scriptName;
            const jobIdName = data.jobId;
            
            if (typeof data.payload === "string") {
                try {
                    const parsed = JSON.parse(data.payload);
                    if (parsed && parsed.name) {
                        scriptName = parsed.name;
                    } else {
                        scriptName = data.payload;
                    }
                } catch {
                    scriptName = data.payload;
                }
            } else if (data.payload && data.payload.name) {
                scriptName = data.payload.name;
            } else {
                log("Unexpected data format from Lambda:", data);
                return;
            }
            log(`Received script name: ${scriptName}`);

            await executeScriptAndSendResult(scriptName, jobIdName);

        } else if (heartbeatResponse.status === 204) {
            log("No data in Lambda queue. Waiting for next heartbeat...");
        } else {
            log("Unexpected response from Lambda:", heartbeatResponse.status, heartbeatResponse.data);
        }

    } catch (error) {
        if (error.response) {
            log("Error response from Lambda:", error.response.status, error.response.data);
        } else {
            log("Request error:", error.message);
        }
    }
}

async function executeScriptAndSendResult(scriptBaseName, jobIdBase) {
    const jobIdd = jobIdBase;
    const scriptFile = `${scriptBaseName}.js`;
    const scriptPath = path.resolve(__dirname, scriptFile);

    let stdoutData = '';
    let stderrData = '';
    let finished = false;

    log(`Executing script: ${scriptPath}`);

    const child = spawn('node', [scriptPath]);

    child.stdout.on('data', (data) => {
        stdoutData += data.toString();
        process.stdout.write(`[${scriptFile}] stdout: ${data}`);
    });

    child.stderr.on('data', (data) => {
        stderrData += data.toString();
        process.stderr.write(`[${scriptFile}] stderr: ${data}`);
    });

    // Timeout in case the script hangs (2 minutes)
    const timeout = setTimeout(() => {
        if (!finished) {
            finished = true;
            child.kill('SIGKILL');
            sendResult(-1, stdoutData, stderrData + '\n[Timeout: process killed]');
        }
    }, 2 * 60 * 1000);

    child.on('close', (code) => {
        if (!finished) {
            finished = true;
            clearTimeout(timeout);
            sendResult(code, stdoutData, stderrData);
        }
    });

    child.on('error', (err) => {
        if (!finished) {
            finished = true;
            clearTimeout(timeout);
            sendResult(-1, '', `[${scriptFile}] Failed to start process: ${err.message}`);
        }
    });

    async function sendResult(exitCode, stdout, stderr) {
        const resultPayload = {
            script: scriptFile,
            jobId: jobIdd,
            exitCode,
            stdout,
            stderr,
            timestamp: new Date().toISOString()
        };

        const urlObj = new URL(piUrl);
        urlObj.searchParams.set('jobId', jobIdd);
        const urlWithJobId = urlObj.toString();

        try {
            const response = await axios.post(urlWithJobId, resultPayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': AUTH_TOKEN,
                }
            });
            log(`[${scriptFile}] Result sent to piUrl. Status: ${response.status}`);
        } catch (err) {
            log(`[${scriptFile}] Error sending result to piUrl:`, err.message);
        }
    }
}

// Self-invoking loop to avoid overlapping intervals
(async function loop() {
    while (true) {
        await sendHeartbeatAndProcess();
        await new Promise(res => setTimeout(res, intervalInSeconds * 1000));
    }
})();
