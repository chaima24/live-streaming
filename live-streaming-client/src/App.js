import React, { useRef } from 'react';

const App = () => {
  const videoRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const startStream = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        videoRef.current.srcObject = stream;
        remoteStreamRef.current = stream;

        const mediaRecorder = new MediaRecorder(stream);
        const socket = new WebSocket('ws://localhost:5000/stream');

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                console.log('Sending data chunk to server:', event.data.size);
                socket.send(event.data);
            }
        };

        mediaRecorder.start(1000); // Adjust the interval as needed
    } catch (error) {
        console.error('Error starting stream:', error);
    }
};


  const stopStream = async () => {
    if (remoteStreamRef.current) {
      const tracks = remoteStreamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      remoteStreamRef.current = null;

      // Notify the Node.js server to stop streaming
      await fetch('http://localhost:5000/stop-stream');
    }
  };

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline></video>
      <button onClick={startStream}>Start Stream</button>
      <button onClick={stopStream}>Stop Stream</button>
    </div>
  );
};

export default App;
