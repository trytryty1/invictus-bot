// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDlC0g7APbFTEXGsye47MxNnu-0E1GTjXA",
  authDomain: "invictus-bot-19bf9.firebaseapp.com",
  projectId: "invictus-bot-19bf9",
  storageBucket: "invictus-bot-19bf9.appspot.com",
  messagingSenderId: "297833772707",
  appId: "1:297833772707:web:b191d38c334099c8d0f116",
  measurementId: "G-BKD42W2SPN"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);