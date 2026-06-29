import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAMWr0iOBgu03qkPgcARL3dGwr4tbyOlpk",
  authDomain: "sentinel-a9e9d.firebaseapp.com",
  projectId: "sentinel-a9e9d",
  storageBucket: "sentinel-a9e9d.firebasestorage.app",
  messagingSenderId: "893293321622",
  appId: "1:893293321622:web:25be01393ca1b6c93c11b7",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
