const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, '/')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const fetch = require('node-fetch');
const puppeteer = require('puppeteer');

let browser;
let page;

(async () => {
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
  await page.goto('https://www.google.com');
})();

const GOOGLE_API_KEY = 'AIzaSyBbkfIKUE0XMliq1Sxleofkoii3yOF1-VM';
const { getStream } = require('puppeteer-stream');

const GOOGLE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`;

app.get('/stream', async (req, res) => {
    const stream = await getStream(page, { audio: false, video: true });
    res.writeHead(200, {
        'Content-Type': 'video/webm',
    });
    stream.pipe(res);
});

async function getAIResponse(prompt) {
  try {
    const response = await fetch(GOOGLE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
      }),
    });
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error getting AI response:', error);
    return 'Sorry, I am having trouble connecting to the AI.';
  }
}

async function executePuppeteerCommand(command) {
  try {
    const result = await eval(`(async () => { ${command} })()`);
    return result;
  } catch (error) {
    console.error('Error executing Puppeteer command:', error);
    return `Error: ${error.message}`;
  }
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    console.log(`Received message => ${message}`);
    const aiResponse = await getAIResponse(`Based on the following user request, what is the single puppeteer command to execute? User request: ${message}`);
    console.log(`AI response => ${aiResponse}`);
    const result = await executePuppeteerCommand(aiResponse);
    ws.send(`Executed: ${aiResponse}\nResult: ${result}`);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
