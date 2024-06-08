import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const RTMPViewer = () => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      playerRef.current = videojs(videoRef.current, {
        controls: true,
        autoplay: true,
        preload: 'auto',
        sources: [{
          src: 'http://localhost:8085/hls/playlist.m3u8',
          type: 'application/x-mpegURL'
        }]
      });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, []);

  return (
    <div>
      <h2>HLS Viewer</h2>
      <video ref={videoRef} className="video-js vjs-default-skin" style={{ width: '100%' }} />
    </div>
  );
};

export default RTMPViewer;
