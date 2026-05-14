import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAFIrfrPQS3APZJbUh9MPTM6b32JygzDLA",
  authDomain: "quant-d0257.firebaseapp.com",
  projectId: "quant-d0257",
  storageBucket: "quant-d0257.firebasestorage.app",
  messagingSenderId: "200502837076",
  appId: "1:200502837076:web:038741db026ec6e8b292c1",
  measurementId: "G-YLMW4YRPCP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
