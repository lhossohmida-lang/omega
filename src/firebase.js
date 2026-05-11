// Firebase Configuration for OMEGA Restaurant App
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCCeuNEpe9jeBzJAi8JEagntMUB7fpfCfM",
  authDomain: "basst-omeeega.firebaseapp.com",
  projectId: "basst-omeeega",
  storageBucket: "basst-omeeega.firebasestorage.app",
  messagingSenderId: "460415849502",
  appId: "1:460415849502:web:d8f543864c112a8bb7ca0f",
  measurementId: "G-2YN44CMCX6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
