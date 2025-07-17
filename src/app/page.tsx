"use client";
import React, { useState } from "react";
import SimliAgent from "@/app/SimliAgent"; // SimliAgentのパス
import DottedFace from "@/app/Components/DottedFace"; // DottedFaceのパス
// 不要なインポートを削除: SimliHeaderLogo, Navbar, Image, GitHubLogo

const HomeMinimal: React.FC = () => {
  const [showDottedFace, setShowDottedFace] = useState<boolean>(true); // 型を明示的に指定

  // SimliAgentが開始されたときにDottedFaceを非表示にする
  const onStart = () => {
    console.log("Setting showDottedFace to false...");
    setShowDottedFace(false);
  };

  // SimliAgentが閉じられたときにDottedFaceを再表示する
  const onClose = () => {
    console.log("Setting showDottedFace to true...");
    setShowDottedFace(true);
  };

  return (
    // 全体を中央に配置し、背景を黒にするシンプルなレイアウト
    <div className="bg-black min-h-screen flex flex-col justify-center items-center p-4">
      {/* アバターとローディング表示のコンテナ */}
      <div className="flex flex-col items-center gap-6 bg-zinc-900 p-6 rounded-xl shadow-lg">
        <div>
          {/* SimliAgentがアクティブでない場合にDottedFaceを表示 */}
          {showDottedFace && <DottedFace />}
          {/* SimliAgentコンポーネント */}
          <SimliAgent
            onStart={onStart}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default HomeMinimal;
