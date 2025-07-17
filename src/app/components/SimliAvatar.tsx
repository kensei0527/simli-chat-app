// src/app/components/SimliAvatar.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SimliClient, SimliClientConfig } from 'simli-client';

interface SimliAvatarProps {
  faceId: string;
}

const SimliAvatar: React.FC<SimliAvatarProps> = ({ faceId }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const simliClientRef = useRef<SimliClient | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false); // マイクがアクティブかどうか
  const [isSimliConnected, setIsSimliConnected] = useState(false); // Simli接続状態

  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const client = new SimliClient();
    simliClientRef.current = client;

    client.on('connected', () => {
      console.log('Simli connected!');
      setIsSimliConnected(true);
      startMicrophoneAndStreamToSimli(client);
    });

    client.on('disconnected', () => {
      console.log('Simli disconnected!');
      setIsSimliConnected(false);
      stopMicrophone();
    });

    client.on('failed', (error: any) => {
      console.error('Simli connection failed:', error);
      alert(`Simli connection failed: ${error instanceof Error ? error.message : String(error)}`);
      setIsSimliConnected(false);
      stopMicrophone();
    });

    client.on('speaking', () => {
      setIsSpeaking(true);
      console.log('Simli is speaking.');
    });

    client.on('silent', () => {
      setIsSpeaking(false);
      console.log('Simli is silent.');
    });

    return () => {
      if (simliClientRef.current && typeof simliClientRef.current.close === 'function') {
        simliClientRef.current.close();
      }
      stopMicrophone();
    };
  }, []);

  const initializeAndStartSimli = useCallback(async () => {
    const client = simliClientRef.current;
    if (!client || isListening || isSimliConnected) return;

    try {
      const backendProxyUrl = '/api/simli-proxy'; 

      // 1. Simli Autoのセッショントークンをプロキシ経由で取得
      // POST /auto/token
      const tokenResponse = await fetch(backendProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'createAutoToken', // プロキシにトークン生成リクエストを伝える
        }),
      });
      const tokenData = await tokenResponse.json();
      console.log('Token Data from /api/simli-proxy (createAutoToken):', tokenData);
      
      if (tokenData.error) throw new Error(tokenData.error);
      if (!tokenData.session_token) { 
          throw new Error("Missing session_token in token proxy response.");
      }

      // 2. ICEサーバー情報をプロキシ経由で取得
      // POST /getIceServers
      const iceResponse = await fetch(backendProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'getIceServers', // プロキシにICEサーバーリクエストを伝える
        }),
      });
      
      // JSON応答を直接ICEサーバーの配列として受け取る
      const receivedIceServersArray = await iceResponse.json(); 
      console.log('ICE Config from /api/simli-proxy (getIceServers):', receivedIceServersArray);

      if (receivedIceServersArray.error) throw new Error(receivedIceServersArray.error); // もしエラーオブジェクトが返された場合
      // 受け取ったデータが配列であることを確認
      if (!Array.isArray(receivedIceServersArray)) { 
          throw new Error("Invalid ICE proxy response: Expected an array of iceServers.");
      }

      // SimliClientConfig の準備（変更なし）
      const config: SimliClientConfig = {
        faceID: faceId,
        session_token: tokenData.session_token, 
        SimliURL: tokenData.ws_url,
        apiKey: '', 
        maxRetryAttempts: 3, 
        retryDelay_ms: 1000,
        handleSilence: true,
        maxSessionLength: 3600,
        maxIdleTime: 600,
        videoRef: videoRef.current!,
        audioRef: audioRef.current!,
        enableConsoleLogs: true,
      };

      // SimliClientを初期化
      client.Initialize(config);
      console.log('SimliClient initialized with Simli Auto token and WebRTC config.');
      
      // WebRTC接続を開始 (取得したICEサーバーの配列を直接渡す)
      // ★★★ ここを修正 ★★★
      // receivedIceServersArray は既に RTCIceServer[] 型の配列と想定されるため、これを直接渡す
      client.start(receivedIceServersArray); 
      console.log('Attempting to start Simli client WebRTC connection with provided ICE servers...');

    } catch (error: unknown) {
      console.error('Failed to initialize or start Simli client:', error);
      alert(`Error initializing/starting Simli: ${error instanceof Error ? error.message : String(error)}`);
      stopMicrophone(); 
      setIsSimliConnected(false);
    }
  }, [faceId, isListening, isSimliConnected]);


  const startMicrophoneAndStreamToSimli = useCallback(async (client: SimliClient) => {
    if (isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setIsListening(true);
      console.log('Microphone access granted. Streaming to Simli...');

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        client.listenToMediastreamTrack(audioTrack);
      } else {
        console.error('No audio track found in microphone stream.');
        stopMicrophone();
      }

    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access denied or error. Please allow microphone access.');
      setIsListening(false);
    }
  }, [isListening]);

  const stopMicrophone = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsListening(false);
    console.log('Microphone stopped.');
  }, []);

  const handleStopSimli = () => {
    const client = simliClientRef.current;
    if (client && typeof client.close === 'function') {
      client.close();
      console.log('Closing Simli client...');
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1>Simli AI Avatar Chat</h1>
      <div style={{ position: 'relative', width: '640px', height: '480px', margin: '20px auto', border: '1px solid #ccc' }}>
        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
      </div>
      <div>
        <button onClick={initializeAndStartSimli} disabled={isListening || isSimliConnected} style={{ margin: '10px', padding: '10px 20px', fontSize: '16px' }}>
          Start Conversation
        </button>
        <button onClick={handleStopSimli} disabled={!isSimliConnected} style={{ margin: '10px', padding: '10px 20px', fontSize: '16px' }}>
          Stop Conversation
        </button>
      </div>
      <p>Simli Speaking: {isSpeaking ? 'Yes' : 'No'}</p>
      <p>Microphone Listening: {isListening ? 'Yes' : 'No'}</p>
    </div>
  );
};

export default SimliAvatar;