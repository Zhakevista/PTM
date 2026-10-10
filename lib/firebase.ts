import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let db: Database | undefined;

/** Ленивая инициализация: безопасно при SSR и при hot-reload. */
export function getDb(): Database {
  if (!db) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    db = getDatabase(app);
  }
  return db;
}

/** Регламент встречи в секундах (по умолчанию 5 минут). */
export const MEETING_SECONDS =
  Math.max(1, Number(process.env.NEXT_PUBLIC_MEETING_MINUTES ?? 5)) * 60;
