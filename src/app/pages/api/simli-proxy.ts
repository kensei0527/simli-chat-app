// pages/api/simli-proxy.ts

import type { NextApiRequest, NextApiResponse } from 'next';

// 環境変数からSimliのAPIキーを取得
// Vercelにデプロイする場合は、Vercelの環境変数にSIMLI_API_KEYを設定してください。
const SIMLI_API_KEY = process.env.SIMLI_API_KEY;

// Simliの公式認証エンドポイント
const SIMLI_AUTH_URL = "https://api.simli.ai/startAudioToVideoSession";
const SIMLI_ICE_SERVER_URL = "https://api.simli.ai/getIceServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // APIキーが設定されているか確認
  if (!SIMLI_API_KEY) {
    return res.status(500).json({ error: "SIMLI_API_KEY is not set in environment variables." });
  }

  // POSTリクエストのみを処理
  if (req.method === 'POST') {
    try {
      // リクエストタイプによって処理を分岐
      if (req.body.type === 'startSession') {
        // /startAudioToVideoSession エンドポイントへのプロキシ
        const { faceId, handleSilence, maxSessionLength, maxIdleTime } = req.body;
        const payload = {
          apiKey: SIMLI_API_KEY, // サーバーサイドでAPIキーを注入
          faceId,
          handleSilence,
          maxSessionLength,
          maxIdleTime,
        };

        const simliResponse = await fetch(SIMLI_AUTH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        // Simliからの応答が成功したか確認
        if (!simliResponse.ok) {
          const errorData = await simliResponse.json();
          throw new Error(`Simli API error: ${simliResponse.status} - ${errorData.message || simliResponse.statusText}`);
        }

        const data = await simliResponse.json();
        return res.status(200).json(data);

      } else if (req.body.type === 'getIceServer') {
        // /getIceServer エンドポイントへのプロキシ
        const payload = { apiKey: SIMLI_API_KEY }; // サーバーサイドでAPIキーを注入

        const iceResponse = await fetch(SIMLI_ICE_SERVER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        // ICEサーバーからの応答が成功したか確認
        if (!iceResponse.ok) {
          const errorData = await iceResponse.json();
          throw new Error(`Simli ICE server API error: ${iceResponse.status} - ${errorData.message || iceResponse.statusText}`);
        }

        const data = await iceResponse.json();
        return res.status(200).json(data);

      } else {
        // 未定義のリクエストタイプ
        res.status(400).json({ error: 'Invalid request type provided.' });
      }

    } catch (error: any) {
      // エラーハンドリング
      console.error('Simli proxy error:', error);
      res.status(500).json({ error: error.message || 'An unexpected error occurred on the proxy server.' });
    }
  } else {
    // POST以外のメソッドは許可しない
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}