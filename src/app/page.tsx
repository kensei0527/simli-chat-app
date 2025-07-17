// src/app/page.tsx
// App Routerのルートページコンポーネント

import SimliAvatar from './components/SimliAvatar';
// import Head from 'next/head'; // App Routerでは通常不要

// メタデータ設定 (App Routerの場合のHead代替)
export const metadata = {
  title: 'Simli Chat App',
  description: 'AI Avatar Chat with Simli',
  // faviconはpublicディレクトリに配置されます
};

const Home: React.FC = () => {
  // 環境変数からFace IDを取得
  const simliFaceId = process.env.NEXT_PUBLIC_SIMLI_FACE_ID || '';

  return (
    <div>
      {/* App Routerでは<Head>タグは不要で、metadataエクスポートでSEO情報を管理します */}
      <main>
        <SimliAvatar faceId={simliFaceId} />
      </main>
    </div>
  );
};

export default Home;