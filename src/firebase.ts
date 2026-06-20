import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDIAnI6BW2aDVYVO2MRIE4oetnO2Y7FcLU",
  authDomain: "barbearia-genesis.firebaseapp.com",
  projectId: "barbearia-genesis",
  storageBucket: "barbearia-genesis.firebasestorage.app",
  messagingSenderId: "759365410229",
  appId: "1:759365410229:web:f4ffe3fa2486b2161d0dfc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the database ID provided in the configuration
const db = initializeFirestore(app, {}, "ai-studio-e71637b1-5244-41e8-83e5-2d1d5946b769");

export { db };
