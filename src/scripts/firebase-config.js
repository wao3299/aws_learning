/* Firebase コンソールの「プロジェクトの設定 > マイアプリ」の firebaseConfig から転記する。
   apiKey は公開前提の識別子でシークレットではない（保護は Firestore セキュリティルール）。
   apiKey が空の間はログイン UI ごと無効になる（sync.js 参照） */
export const firebaseConfig = {
  apiKey: "AIzaSyCISvsbm1zphIfb9ZD51hknC7OW5e56Qyo",
  authDomain: "study-deck-a1f83.firebaseapp.com",
  projectId: "study-deck-a1f83",
};
