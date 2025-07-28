// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyDhvGnJ1QJgZsIrCy6E5tgiF7BbC66Xv9g",
    authDomain: "dreamworld-f7a4b.firebaseapp.com",
    projectId: "dreamworld-f7a4b",
    storageBucket: "dreamworld-f7a4b.firebasestorage.app",
    messagingSenderId: "330382191425",
    appId: "1:330382191425:web:501903d678634f5eab4fc0",
    measurementId: "G-0ZCDVMLP7B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
