// pages/index.tsx
import SimliAvatar from '../components/SimliAvatar';
import Head from 'next/head';

const Home: React.FC = () => {
  // 環境変数からFace IDを取得
  const simliFaceId = process.env.NEXT_PUBLIC_SIMLI_FACE_ID || '';

  return (
    <div>
      <Head>
        <title>Simli Chat App</title>
        <meta name="description" content="AI Avatar Chat with Simli" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        {/* SimliAvatarコンポーネントにFace IDを渡し、プロキシは自動的に/api/simli-proxyを使用 */}
        <SimliAvatar faceId={simliFaceId} />
      </main>
    </div>
  );
};

export default Home;