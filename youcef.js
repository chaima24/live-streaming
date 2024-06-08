const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const cors = require('cors');
const WebSocket = require('ws');

// Parse JSON and urlencoded request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS for all requests
app.use(cors());

// Create a WebSocket server
const wss = new WebSocket.Server({ server: http });

wss.on('connection', (ws) => {
    console.log('Client connected');

    const ffmpeg = spawn('ffmpeg', [
        '-re', // Read input at native frame rate
        '-i', 'pipe:0', // input from stdin
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-f', 'flv', 'rtmp://localhost:1935/live',
    ]);

    ffmpeg.stdout.on('data', (data) => {
        console.log(`FFmpeg stdout: ${data}`);
    });

    ffmpeg.stderr.on('data', (data) => {
        console.error(`FFmpeg stderr: ${data}`);
    });

    ffmpeg.on('close', (code) => {
        console.log(`FFmpeg process exited with code ${code}`);
    });

    ws.on('message', (message) => {
        console.log('Received data chunk from client:', message.length);
        ffmpeg.stdin.write(message);
    });

    ws.on('close', () => {
        ffmpeg.stdin.end();
    });
});

app.post('/stop-stream', (req, res) => {
  // Implement logic to stop streaming if needed
  // For example, you can terminate the ffmpeg process here

  // Send a response back to the client
  res.sendStatus(200);
});

http.listen(5000, () => {
  console.log('Bridge server running on port 5000');
});
