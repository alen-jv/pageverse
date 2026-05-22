// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBI4xwm6hQQpRR3rEUri07g9B2XnGI0szY",
  authDomain: "pageverse-264da.firebaseapp.com",
  projectId: "pageverse-264da",
  storageBucket: "pageverse-264da.firebasestorage.app",
  messagingSenderId: "634613113614",
  appId: "1:634613113614:web:0ca0d43fd6697f848bad5f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);