const { performance } = require('perf_hooks');

// Use global fetch if available (Node 18+), otherwise require node-fetch
let fetchFn;
try {
    fetchFn = fetch;
} catch (e) {
    fetchFn = require('node-fetch');
}

const fileUrl = "https://speedtest.singapore.linode.com/100MB-singapore.bin";
const fileSizeInBytes = 100 * 1024 * 1024;

async function testInternetSpeed() {
    const startTime = performance.now();
    let result = {
        success: false,
        speedMbps: null,
        durationSeconds: null,
        error: null
    };

    try {
        const response = await fetchFn(fileUrl, { method: 'GET', cache: 'no-cache' });
        if (!response.ok) throw new Error(`Failed to fetch test file: HTTP ${response.status}`);

        // Actually download the file
        await response.arrayBuffer();

        const endTime = performance.now();
        const durationInSeconds = (endTime - startTime) / 1000;
        const bitsLoaded = fileSizeInBytes * 8;
        const speedMbps = (bitsLoaded / durationInSeconds) / (1024 * 1024);

        result.success = true;
        result.speedMbps = Number(speedMbps.toFixed(2));
        result.durationSeconds = Number(durationInSeconds.toFixed(2));
    } catch (err) {
        result.error = err.message;
    }

    // Output as JSON for robust parsing
    console.log(JSON.stringify(result));
}

testInternetSpeed();
