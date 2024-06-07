import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const WebRTCViewer = () => {
  const remoteVideoRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [streamTerminated, setStreamTerminated] = useState(false);

  useEffect(() => {
    socket.on('offer', handleOffer);
    socket.on('candidate', handleCandidate);
    socket.on('stop-stream', handleStopStream);

    return () => {
      socket.off('offer', handleOffer);
      socket.off('candidate', handleCandidate);
      socket.off('stop-stream', handleStopStream);
    };
  }, []);

  const handleOffer = async (offer) => {
    setStreamTerminated(false);
    const peer = createPeerConnection();
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit('answer', answer);
  };

  const handleCandidate = async (candidate) => {
    if (peerConnection) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const handleStopStream = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setStreamTerminated(true);
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

    peer.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    setPeerConnection(peer);
    return peer;
  };

  return (
    <div>
      <h2>WebRTC Viewer</h2>
      {streamTerminated ? (
        <div className="terminated-message">The live stream has been terminated.</div>
      ) : (
        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%' }} />
      )}
    </div>
  );
};

export default WebRTCViewer;
