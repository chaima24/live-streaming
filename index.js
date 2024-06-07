const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { spawn } = require('child_process');
const cors = require('cors');
const wrtc = require('wrtc');  // Import wrtc

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

let peerConnection;  // Move peerConnection outside to be used globally
let ffmpeg;  // FFmpeg process

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('offer', (offer) => {
    socket.broadcast.emit('offer', offer);
  });

  socket.on('answer', (answer) => {
    socket.broadcast.emit('answer', answer);
  });

  socket.on('candidate', (candidate) => {
    socket.broadcast.emit('candidate', candidate);
  });

  socket.on('webrtc-offer', (offer) => {
    handleWebRTCOffer(socket, offer);
  });

  socket.on('webrtc-candidate', (candidate) => {
    handleWebRTCCandidate(candidate);
  });

  socket.on('stop-stream', () => {
    socket.broadcast.emit('stop-stream');
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    if (ffmpeg) {
      ffmpeg.stdin.end();
      ffmpeg = null;
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const handleWebRTCOffer = async (socket, offer) => {
  peerConnection = new wrtc.RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc-candidate', event.candidate);
    }
  };

  // Initialize an empty MediaStream to collect tracks
  const remoteStream = new wrtc.MediaStream();
  peerConnection.ontrack = (event) => {
    remoteStream.addTrack(event.track);
    if (remoteStream.getTracks().length === 2) { // Assuming we have one video and one audio track
      pushStreamToRTMP(remoteStream);
    }
  };

  await peerConnection.setRemoteDescription(new wrtc.RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('webrtc-answer', peerConnection.localDescription);
};

const handleWebRTCCandidate = async (candidate) => {
  if (peerConnection) {
    await peerConnection.addIceCandidate(new wrtc.RTCIceCandidate(candidate));
  }
};

const pushStreamToRTMP = (stream) => {
  const command = `ffmpeg -i - -c:v libx264 -c:a aac -f flv rtmp://localhost/live/stream`;
  ffmpeg = spawn(command, { shell: true });

  ffmpeg.stdin.on('error', (error) => {
    console.error('FFmpeg stdin error:', error);
  });

  ffmpeg.stderr.on('data', (data) => {
    console.error('FFmpeg stderr:', data.toString());
  });

  ffmpeg.on('close', (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
  });

  stream.getTracks().forEach((track) => {
    const sender = peerConnection.addTrack(track, stream);
    sender.replaceTrack(track);  // Ensure the track is properly handled
    track.ondata = (data) => {
      ffmpeg.stdin.write(data);
    };
  });
};

app.get('/', (req, res) => {
  res.send('WebRTC Signaling Server');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
