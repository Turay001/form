// --- Configuration ---
// Replace this with your own deployed Apps Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbyjKdVTHi4YCB_9K36x1XewbBwWKc2y_9PA9Wp6BlpognwaueXA88H98tUuYKiMx1i2/exec';

// --- Utility Functions ---

/**
 * Handles the API fetch request with exponential backoff for retry.
 */
async function fetchWithBackoff(endpoint, payload, retries = 0, maxRetries = 3) {
    // Set loading state
    const form = document.querySelector('form');
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = `<div class="loading-spinner w-5 h-5 border-2 rounded-full mx-auto"></div>`;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.status === 'error' || !response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        return data;

    } catch (error) {
        if (retries < maxRetries) {
            const delay = Math.pow(2, retries) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithBackoff(endpoint, payload, retries + 1, maxRetries);
        } else {
            throw new Error(error.message || 'Failed to connect to the backend service.');
        }
    } finally {
        // Reset loading state
        if (submitButton) {
            submitButton.disabled = false;
            const page = window.location.pathname.split('/').pop();
            if (page === 'signup.html' || !page) {
                submitButton.textContent = 'Sign Up';
            } else if (page === 'login.html') {
                submitButton.textContent = 'Log In';
            }
        }
    }
}

/**
 * Display an error message in the UI.
 */
function displayError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.innerHTML = `<div class="error-message mb-6">${message}</div>`;
    }
}

/**
 * Clear the error message area.
 */
function clearError() {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.innerHTML = '';
    }
}

// --- Page Specific Handlers ---

/**
 * Handler for the Signup form.
 */
async function handleSignup(event) {
    event.preventDefault();
    clearError();

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    if (!name || !email || !password) {
        return displayError('All fields are required.');
    }
    if (password.length < 6) {
        return displayError('Password must be at least 6 characters.');
    }

    try {
        const result = await fetchWithBackoff(API_URL, {
            action: 'signup',
            name: name,
            email: email,
            password: password
        });

        if (result.success || result.status === 'success') {
            alert('Signup successful! Please log in.');
            window.location.href = 'login.html';
        } else {
            displayError(result.message || 'Signup failed. Please try again.');
        }
    } catch (error) {
        displayError(error.message || 'A network error occurred during signup.');
    }
}

/**
 * Handler for the Login form.
 */
async function handleLogin(event) {
    event.preventDefault();
    clearError();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        return displayError('Both email and password are required.');
    }

    try {
        const result = await fetchWithBackoff(API_URL, {
            action: 'login',
            email: email,
            password: password
        });

        if (result.success || result.status === 'success') {
            sessionStorage.setItem('currentUser', JSON.stringify({ name: result.name, email: email }));
            window.location.href = 'dashboard.html';
        } else {
            displayError(result.message || 'Login failed. Invalid email or password.');
        }
    } catch (error) {
        displayError(error.message || 'A network error occurred during login.');
    }
}

/**
 * Handles the logout action.
 */
function handleLogout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

/**
 * Initializes dashboard content.
 */
function initializeDashboard() {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    const greetingElement = document.getElementById('user-greeting');

    if (!user || !greetingElement) {
        return window.location.href = 'login.html';
    }

    const currentHour = new Date().getHours();
    let greetingText = "Welcome";
    if (currentHour < 12) greetingText = "Good morning";
    else if (currentHour < 18) greetingText = "Good afternoon";
    else greetingText = "Good evening";

    greetingElement.textContent = `${greetingText}, ${user.name}!`;
}

// --- Initialization ---

window.onload = () => {
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'dashboard.html') {
        initializeDashboard();
    }

    // Attach handlers to forms
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Attach logout handler
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
};
