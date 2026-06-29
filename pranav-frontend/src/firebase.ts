import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCAlAP7DpUnvckkNyrHxZIDFK8y-pUzLEk",
  authDomain: "rtmts-scanner.firebaseapp.com",
  projectId: "rtmts-scanner",
  storageBucket: "rtmts-scanner.firebasestorage.app",
  messagingSenderId: "593134738582",
  appId: "1:593134738582:web:e0bbb0ba4e6f607cbf76b7",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
