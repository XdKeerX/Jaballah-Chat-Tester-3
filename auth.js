// auth.js

import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const loginForm = document.getElementById('login-form' );
const registerForm = document.getElementById('register-form');
const errorMessage = document.getElementById('error-message');

// Redirect user if already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        // If on login/register page, redirect to chat
        if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('register.html') || window.location.pathname === '/') {
            window.location.href = 'chat.html';
        }
    }
});

// Handle Login
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Signed in
                window.location.href = 'chat.html';
            })
            .catch((error) => {
                errorMessage.textContent = error.message;
            });
    });
}

// Handle Registration
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        if (password.length < 6) {
            errorMessage.textContent = 'Password should be at least 6 characters.';
            return;
        }

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Registered and signed in
                window.location.href = 'chat.html';
            })
            .catch((error) => {
                errorMessage.textContent = error.message;
            });
    });
}
