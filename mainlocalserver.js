const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }
    filePath = path.resolve(__dirname, filePath);
    
    // Security check: Ensure the resolved path is within the project directory.
    // This prevents clients from requesting files outside your project.
    if (!filePath.startsWith(__dirname + path.sep)) {
        res.writeHead(403); // Forbidden
        res.end('Access denied');
        return;
    }
    console.log(`Attempting to serve: ${filePath}`);

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.ico': 'image/x-icon'
    };
    let contentType = mimeTypes[extname] || 'application/octet-stream';

    if (req.method === 'POST' && req.url === '/incomjson.js') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString(); // Ensure chunks are converted to string
        });

        req.on('end', () => {
            try {
                const parsedData = JSON.parse(body);
                console.log("Received data:", parsedData);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Data received successfully', receivedData: parsedData })); // Echo back data for confirmation
            } catch (e) {
                console.error("Error parsing JSON for /incomjson.js:", e.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON provided' }));
            }
        });
        return;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // File not found (404)
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1><p>The requested file could not be found.</p>');
            } else {
                // Other server errors (500)
                console.error(`Error serving ${filePath}:`, error);
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(`<h1>500 Internal Server Error</h1><p>Something went wrong: ${error.code}</p>`);
            }
        } else {
            // Success: serve the file
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const PORT = 8080; // Use environment variable for port or default to 8080
const HOST = '0.0.0.0'; // Listen on all available network interfaces

server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}/`);
    console.log('Press Ctrl+C to stop the server.');
});
