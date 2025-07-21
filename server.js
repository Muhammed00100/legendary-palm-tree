const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const puppeteer = require('puppeteer');
const { getStream } = require('puppeteer-stream');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Google AI Setup
const API_KEY = 'AIzaSyBbkfIKUE0XMliq1Sxleofkoii3yOF1-VM';
const genAI = new GoogleGenerativeAI(API_KEY);

let browser;
let page;

async function startBrowser() {
    browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    await page.goto('https://www.google.com');
}

startBrowser();

wss.on('connection', (ws) => {
    const stream = getStream(page, {
        audio: false,
        video: true,
        frameSize: 1000 // kb
    });

    stream.on('data', (data) => {
        ws.send(data);
    });

    ws.on('close', () => {
        stream.destroy();
    });
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/api/execute', async (req, res) => {
    const { command } = req.body;

    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `You are an AI assistant controlling a headless browser. Convert the following user command into a series of executable Puppeteer commands in JavaScript. The 'page' object is already available. Only output the code. User command: "${command}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const codeToExecute = response.text();

        // Execute the code in the existing page context
        await eval(`(async () => { ${codeToExecute} })()`);

        res.json({ message: 'Command executed' });

    } catch (error) {
        console.error('Error executing command:', error);
        res.status(500).json({ error: 'Failed to execute command' });
    }
});

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
