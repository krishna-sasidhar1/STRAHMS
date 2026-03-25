const loginFormEl = document.getElementById('login-form');
const signupFormEl = document.getElementById('signup-form-el');

const loginContainer = document.getElementById('login-form-container');
const signupContainer = document.getElementById('signup-form-container');

const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');

const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');

const API_BASE = 'http://localhost:3000/api';

// Toggle forms
showSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginContainer.style.display = 'none';
    signupContainer.style.display = 'block';
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signupContainer.style.display = 'none';
    loginContainer.style.display = 'block';
});

// Mock user storage if backend is completely down (Fallback for Demo)
// This lets the frontend work even if MySQL isn't setup.
function fallbackLogin(email, password) {
    const users = JSON.parse(localStorage.getItem('strahms_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    return user;
}
function fallbackSignup(name, email, password, age, occupation) {
    const users = JSON.parse(localStorage.getItem('strahms_users') || '[]');
    if(users.some(u => u.email === email)) return false;
    const newUser = { id: Date.now(), username: name, email, password, age, occupation };
    users.push(newUser);
    localStorage.setItem('strahms_users', JSON.stringify(users));
    return newUser;
}

// Handle Login
loginFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Login failed');
        
        localStorage.setItem('strahms_user', JSON.stringify(data.user));
        window.location.href = 'dashboard.html';
    } catch (err) {
        console.warn('Backend unavailable or error. Trying fallback.', err.message);
        // Fallback
        const user = fallbackLogin(email, password);
        if (user) {
            localStorage.setItem('strahms_user', JSON.stringify(user));
            window.location.href = 'dashboard.html';
        } else {
            loginError.textContent = err.message || 'Invalid email or password';
            loginError.style.display = 'block';
        }
    }
});

// Handle Signup
signupFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupError.style.display = 'none';
    
    const username = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const age = document.getElementById('signup-age').value;
    const occupation = document.getElementById('signup-occupation').value;

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, age, occupation })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Signup failed');
        
        // Auto login on successful signup via fallback flow or alert
        alert('Registration successful! Please login.');
        showLoginBtn.click();
    } catch (err) {
        console.warn('Backend unavailable or error. Trying fallback.', err.message);
        // Fallback
        const user = fallbackSignup(username, email, password, age, occupation);
        if (user) {
            alert('Registration successful (Local Fallback)! Please login.');
            showLoginBtn.click();
        } else {
            signupError.textContent = err.message || 'User with this email already exists';
            signupError.style.display = 'block';
        }
    }
});
