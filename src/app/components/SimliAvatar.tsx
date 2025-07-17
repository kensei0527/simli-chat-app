// components/SimliAvatar.tsx
'use client'; // Next.js App Routerの場合、クライアントコンポーネントとしてマーク

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SimliClient, SimliClientConfig } from 'simli-client';

interface SimliAvatarProps {
  faceId: string;
}

const SimliAvatar: React.FC<SimliAvatarProps> = ({ faceId }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const simliClientRef = useRef<SimliClient | null>(null); // useRefでSimliClientインスタンスを保持
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false); // マイクがアクティブかどうか
  const [isSimliReady, setIsSimliReady] = useState(false); // SimliClientが初期化されたか

  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // SimliClientインスタンスはコンポーネントのマウント時に一度だけ作成
    const client = new SimliClient();
    simliClientRef.current = client; // refに保存

    // Simliイベントリスナーの設定
    client.on('connected', () => {
      console.log('Simli connected!');
      // 接続確立後、マイクからの音声ストリームをSimliに送信開始
      startMicrophoneAndStreamToSimli(client);
    });

    client.on('disconnected', () => {
      console.log('Simli disconnected!');
      stopMicrophone();
      setIsSimliReady(false); // 切断されたら初期化されていない状態に戻す
    });

    client.on('failed', (error: any) => {
      console.error('Simli connection failed:', error);
      alert(`Simli connection failed: ${error instanceof Error ? error.message : String(error)}`);
      stopMicrophone();
      setIsSimliReady(false);
    });

    client.on('speaking', () => {
      setIsSpeaking(true);
      console.log('Simli is speaking.');
    });

    client.on('silent', () => {
      setIsSpeaking(false);
      console.log('Simli is silent.');
    });

    // クリーンアップ関数
    return () => {
      // コンポーネントのアンマウント時に接続を閉じる
      if (simliClientRef.current && simliClientRef.current.close) { // .close()メソッドが存在するか確認
         simliClientRef.current.close();
      }
      stopMicrophone();
    };
  }, []); // 空の依存配列でコンポーネントマウント時に一度だけ実行

  // SimliClientのInitializeとstartは、ボタンクリック時に実行
  const initializeAndStartSimli = useCallback(async () => {
    const client = simliClientRef.current;
    if (!client || isListening || isSimliReady) return; // 既に接続中または初期化済みなら何もしない

    try {
      // バックエンドプロキシのURL
      const backendProxyUrl = '/api/simli-proxy'; 

      // SimliClientConfigの準備（APIキーは含まない）
      let config: SimliClientConfig = {
        faceID: faceId,
        handleSilence: true,
        maxSessionLength: 3600,
        maxIdleTime: 600,
        videoRef: videoRef.current!,
        audioRef: audioRef.current!,
        enableConsoleLogs: true,
        apiKey: '', // or your actual API key if needed
        session_token: '', // will be set later
        SimliURL: '', // or your actual Simli URL if needed
        maxRetryAttempts: 0, // or your desired value
        retryDelay_ms: 0, // or your desired value
      };

      console.log('Using backend proxy for Simli authentication...');

      // 1. セッション開始トークンとWebSocket URLを取得 (プロキシ経由)
      const sessionResponse = await fetch(backendProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'startSession',
          faceId: config.faceID,
          handleSilence: config.handleSilence,
          maxSessionLength: config.maxSessionLength,
          maxIdleTime: config.maxIdleTime,
        }),
      });
      const sessionData = await sessionResponse.json();
      if (sessionData.error) throw new Error(sessionData.error);
      
      // ドキュメントによると `session_token` と `ws_url` が返される
      config.session_token = sessionData.session_token; 
      config.SimliURL = sessionData.ws_url; // WebSocket URLも設定に含める

      // 2. ICEサーバー情報を取得 (プロキシ経由)
      const iceResponse = await fetch(backendProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'getIceServer' }),
      });
      const iceConfig = await iceResponse.json();
      if (iceConfig.error) throw new Error(iceConfig.error);

      // SimliClientを初期化
      client.Initialize(config);
      setIsSimliReady(true);
      console.log('SimliClient initialized.');
      
      // WebRTC接続を開始 (ICE Configを渡す)
      client.start(iceConfig); 
      console.log('Attempting to start Simli client WebRTC connection...');

    } catch (error) {
      console.error('Failed to initialize or start Simli client:', error);
      alert(`Error initializing/starting Simli: ${error instanceof Error ? error.message : String(error)}`);
      stopMicrophone(); // エラー時はマイクも停止
      setIsSimliReady(false);
    }
  }, [faceId, isListening, isSimliReady]);


  // マイクからの音声入力ストリームを開始し、Simliに送信する関数
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

  // マイクからの音声入力ストリームを停止する関数
  const stopMicrophone = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsListening(false);
    console.log('Microphone stopped.');
  }, []);

  // SimliClient.close() を呼び出す関数
  const handleStopSimli = () => {
    const client = simliClientRef.current;
    if (client && client.close) { // .close()メソッドが存在するか確認
      client.close(); // ドキュメントに沿って close() を使用
      console.log('Closing Simli client...');
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1>Simli AI Avatar Chat</h1>
      <div style={{ position: 'relative', width: '640px', height: '480px', margin: '20px auto', border: '1px solid #ccc' }}>
        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {/* audioRefはvideoRefと連携して自動的に音声が再生されるため、通常は不要だが、
            ドキュメントの例に合わせる形で残しておく。display: 'none' で非表示。 */}
        <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
      </div>
      <div>
        <button onClick={initializeAndStartSimli} disabled={isListening || isSimliReady} style={{ margin: '10px', padding: '10px 20px', fontSize: '16px' }}>
          Start Conversation
        </button>
        <button onClick={handleStopSimli} disabled={!isListening} style={{ margin: '10px', padding: '10px 20px', fontSize: '16px' }}>
          Stop Conversation
        </button>
      </div>
      <p>Simli Speaking: {isSpeaking ? 'Yes' : 'No'}</p>
      <p>Microphone Listening: {isListening ? 'Yes' : 'No'}</p>
    </div>
  );
};

export default SimliAvatar;