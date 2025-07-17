// src/app/api/simli-proxy/route.ts

import { NextRequest, NextResponse } from 'next/server';

const SIMLI_API_KEY = process.env.SIMLI_API_KEY;

// Simli Auto APIエンドポイント
const SIMLI_AUTO_TOKEN_URL = "https://api.simli.ai/auto/token";

// Simli WebRTC APIエンドポイント
const SIMLI_GET_ICE_SERVERS_URL = "https://api.simli.ai/getIceServers";

export async function POST(req: NextRequest) {
  if (!SIMLI_API_KEY) {
    console.error("SIMLI_API_KEY is not set in environment variables.");
    return NextResponse.json(
      { error: "Server configuration error: SIMLI_API_KEY is missing." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();

    if (body.type === 'createAutoToken') {
      // Simli Autoのセッショントークンを生成
      const payload = {
        simliAPIKey: SIMLI_API_KEY,
      };

      const simliResponse = await fetch(SIMLI_AUTO_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!simliResponse.ok) {
        const errorData: unknown = await simliResponse.json();
        console.error("Simli /auto/token API error (raw):", simliResponse.status, errorData);
        const errorMessage = typeof errorData === 'object' && errorData !== null && 'message' in errorData
          ? (errorData as { message: string }).message
          : JSON.stringify(errorData);
          throw new Error(`Simli Auto Token API error: ${simliResponse.status} - ${errorMessage}`);
      }

      const data = await simliResponse.json();
      console.log('Raw response from Simli /auto/token:', JSON.stringify(data, null, 2));
      return NextResponse.json(data); // session_token と ws_url を含むことを期待

    } else if (body.type === 'getIceServers') {
      // ICEサーバー情報を取得するプロキシ
      const payload = { apiKey: SIMLI_API_KEY };

      const iceResponse = await fetch(SIMLI_GET_ICE_SERVERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!iceResponse.ok) {
        const errorData: unknown = await iceResponse.json();
        console.error("Simli /getIceServers API error (raw):", iceResponse.status, errorData);
        const errorMessage = 
          typeof errorData === 'object' && errorData !== null && 'message' in errorData
            ? (errorData as { message: string }).message
            : JSON.stringify(errorData);
        throw new Error(`Simli ICE server API error: ${iceResponse.status} - ${errorMessage}`);
      }

      const data = await iceResponse.json();
      console.log('Raw response from Simli /getIceServers:', JSON.stringify(data, null, 2));
      return NextResponse.json(data); // iceServers 配列を含むことを期待

    } else {
      return NextResponse.json({ error: 'Invalid request type provided.' }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error('Simli proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: errorMessage || 'An unexpected error occurred on the proxy server.' },
      { status: 500 }
    );
  }
}