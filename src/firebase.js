import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDQCHmEHSjRGl4R9mgtWdcHAjF_dnLKC6Q",
  authDomain: "ajaia-9a7ae.firebaseapp.com",
  projectId: "ajaia-9a7ae",
  storageBucket: "ajaia-9a7ae.firebasestorage.app",
  messagingSenderId: "528972168666",
  appId: "1:528972168666:web:02c83ae12fb766b52e94e3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);