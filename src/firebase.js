// src/firebase.js

// 1. Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// 2. Your web app's Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyBkhYAazFKTPWA2MMNChflynOprIhZYmlw",
  authDomain: "kvoter-project.firebaseapp.com",
  databaseURL: "https://kvoter-project-default-rtdb.firebaseio.com",
  projectId: "kvoter-project",
  storageBucket: "kvoter-project.firebasestorage.app",
  messagingSenderId: "246130960294",
  appId: "1:246130960294:web:7fb0c74f6ca821cb379167",
  measurementId: "G-QBEJRJ9XLE"
};

// 3. Initialize Firebase and the services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 4. Export the services you'll need in other parts of your app
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();