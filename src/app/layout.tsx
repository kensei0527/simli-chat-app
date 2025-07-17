// src/app/layout.tsx

import './globals.css'; // グローバルCSSをインポート

export const metadata = {
  title: 'Simli Chat App',
  description: 'AI Avatar Chat with Simli',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}