import React, { useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const WebRTCStreamer = ({ onStreamReady }) => {
  const localVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);

  const startStream = async () => {
    if (!localStream) {
      try {
        const constraints = { video: true, audio: true };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localVideoRef.current.srcObject = stream;
        setLocalStream(stream);
        onStreamReady(stream);

        const peer = createPeerConnection();
        stream.getTracks().forEach(track => peer.addTrack(track, stream));
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit('offer', offer);
      } catch (error) {
        console.error('Error accessing media devices.', error);
      }
    }
  };

  const stopStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    localVideoRef.current.srcObject = null;
    socket.emit('stop-stream');
  };

  const handleOffer = async (offer) => {
    if (!peerConnection) {
      const peer = createPeerConnection();
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit('answer', answer);
    }
  };

  const handleAnswer = async (answer) => {
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleCandidate = async (candidate) => {
    if (peerConnection) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const createPeerConnection = () => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('candidate', event.candidate);
      }
    };

    setPeerConnection(peer);
    return peer;
  };

  React.useEffect(() => {
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('candidate', handleCandidate);

    return () => {
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('candidate', handleCandidate);
    };
  }, [localStream]);

  return (
    <div>
      <h2>WebRTC Streamer</h2>
      <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%' }} />
      <button onClick={startStream}>Start Streaming</button>
      <button onClick={stopStream} disabled={!localStream}>Stop Streaming</button>
    </div>
  );
};

export default WebRTCStreamer;
