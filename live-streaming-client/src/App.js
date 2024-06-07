import React, { useState } from 'react';
import WebRTCStreamer from './WebRTCStreamer';
import './App.css';
import WebRTCViewer from './ WebRTCViewer';
function App() {
  const [stream, setStream] = useState(null);

  const handleStreamReady = (stream) => {
    setStream(stream);
  };

  return (
    <div className="App">
      <h1>WebRTC Live Streaming App</h1>
      <div className="container">
        <div className="broadcaster">
          <h2>Broadcaster</h2>
          <WebRTCStreamer onStreamReady={handleStreamReady} />

        </div>
        <div className="viewer">
          <h2>Viewer</h2>
          <WebRTCViewer />
        </div>
      </div>
    </div>
  );
}

export default App;
