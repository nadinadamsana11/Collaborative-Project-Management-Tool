import { auth } from './firebase-config.js';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const fullnameInput = document.getElementById('fullname');
const fullnameContainer = document.getElementById('fullname-container');
const submitBtn = document.getElementById('submit-btn');
const toggleBtn = document.getElementById('toggle-btn');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const googleBtn = document.getElementById('google-btn');
const errorMessage = document.getElementById('error-message');
const loadingOverlay = document.getElementById('loading-overlay');

let isLogin = true;
let isSigningUp = false;

// Auth State Listener
onAuthStateChanged(auth, (user) => {
    if (user && !isSigningUp) {
        // Redirect if logged in
        window.location.href = 'dashboard.html';
    } else {
        // Show login form if not logged in
        if(loadingOverlay) loadingOverlay.classList.add('hidden');
    }
});

// Toggle Login/Signup Mode
function toggleAuthMode() {
    isLogin = !isLogin;
    errorMessage.classList.add('hidden');
    
    if (isLogin) {
        authTitle.textContent = 'Welcome back';
        authSubtitle.textContent = 'Please enter your details to sign in.';
        fullnameContainer.classList.add('hidden');
        submitBtn.textContent = 'Sign In';
        document.getElementById('toggle-text').innerHTML = `Don't have an account? <a id="toggle-btn" class="text-indigo-600 font-semibold hover:underline cursor-pointer">Sign up</a>`;
    } else {
        authTitle.textContent = 'Create an account';
        authSubtitle.textContent = 'Start managing your projects today.';
        fullnameContainer.classList.remove('hidden');
        submitBtn.textContent = 'Sign Up';
        document.getElementById('toggle-text').innerHTML = `Already have an account? <a id="toggle-btn" class="text-indigo-600 font-semibold hover:underline cursor-pointer">Sign in</a>`;
    }
    
    // Re-attach listener to the new button
    document.getElementById('toggle-btn').addEventListener('click', toggleAuthMode);
}

if(toggleBtn) toggleBtn.addEventListener('click', toggleAuthMode);

// Handle Form Submit
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    const fullname = fullnameInput.value;

    errorMessage.classList.add('hidden');
    errorMessage.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    try {
        if (isLogin) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            isSigningUp = true;
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: fullname });
            window.location.href = 'dashboard.html';
        }
        // Redirect handled by onAuthStateChanged
    } catch (error) {
        isSigningUp = false;
        errorMessage.textContent = error.message.replace('Firebase: ', '');
        errorMessage.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = isLogin ? 'Sign In' : 'Sign Up';
    }
});

// Google Login
googleBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.classList.remove('hidden');
    }
});