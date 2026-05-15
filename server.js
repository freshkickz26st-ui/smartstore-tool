const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = 3000;

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/claude') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const { apiKey, payload } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const bodyBuf = Buffer.from(JSON.stringify(payload), 'utf8');
        const options = {
          hostname: 'api.anthropic.com',
          path: '/v1/messages',
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'content-length': bodyBuf.length
          }
        };
        const apiReq = https.request(options, apiRes => {
          const resChunks = [];
          apiRes.on('data', chunk => resChunks.push(chunk));
          apiRes.on('end', () => {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(Buffer.concat(resChunks));
          });
        });
        apiReq.on('error', e => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        });
        apiReq.write(bodyBuf);
        apiReq.end();
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
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
