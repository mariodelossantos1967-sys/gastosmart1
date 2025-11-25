import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB4xKy2-X6dsIstU0-lW2OxgTAWap7GLVo",
  authDomain: "gastosmart-a1de4.firebaseapp.com",
  projectId: "gastosmart-a1de4",
  storageBucket: "gastosmart-a1de4.firebasestorage.app",
  messagingSenderId: "902616502818",
  appId: "1:902616502818:web:f2612cecfced17099bb07b",
  measurementId: "G-GGCSSGTSHM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();