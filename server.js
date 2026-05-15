const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = 3000;

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/claude') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { apiKey, payload } = JSON.parse(body);
      const data = JSON.stringify(payload);
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(data)
        }
      };
      const apiReq = https.request(options, apiRes => {
        let result = '';
        apiRes.on('data', chunk => result += chunk);
        apiRes.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(result);
        });
      });
      apiReq.on('error', e => { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); });
      apiReq.write(data);
      apiReq.end();
    });
  } else if (req.method === 'OPTIONS') {
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST' });
    res.end();
  } else {
    const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200);
      res.end(data);
    });
  }
}).listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
