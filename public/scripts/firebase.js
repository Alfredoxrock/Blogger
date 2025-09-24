// Firebase Configuration using compat libraries
const firebaseConfig = {
    apiKey: "AIzaSyDhvGnJ1QJgZsIrCy6E5tgiF7BbC66Xv9g",
    authDomain: "dreamworld-f7a4b.firebaseapp.com",
    projectId: "dreamworld-f7a4b",
    storageBucket: "dreamworld-f7a4b.firebasestorage.app",
    messagingSenderId: "330382191425",
    appId: "1:330382191425:web:501903d678634f5eab4fc0",
    measurementId: "G-0ZCDVMLP7B"
};

// Initialize Firebase using compat
firebase.initializeApp(firebaseConfig);

// Make Firebase services available globally
window.auth = firebase.auth();
window.db = firebase.firestore();

console.log('Firebase initialized successfully');
