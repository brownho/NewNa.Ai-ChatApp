// Tab switching
function showLogin() {
    document.getElementById('loginForm').style.display = 'flex';
    document.getElementById('signupForm').style.display = 'none';
    document.querySelectorAll('.tab-button')[0].classList.add('active');
    document.querySelectorAll('.tab-button')[1].classList.remove('active');
    clearMessages();
}

function showSignup() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'flex';
    document.querySelectorAll('.tab-button')[0].classList.remove('active');
    document.querySelectorAll('.tab-button')[1].classList.add('active');
    clearMessages();
}

function showForgotPassword() {
    showMessage('Please contact support to reset your password.', 'error');
}

// Message display
function showMessage(message, type) {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    if (type === 'error') {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        successDiv.style.display = 'none';
    } else {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        errorDiv.style.display = 'none';
    }
}

function clearMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

// Form submissions
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.classList.add('loading');
    submitButton.textContent = 'Logging in...';
    
    const formData = {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
    };
    
    try {
        console.log('Attempting login...');
        const loginUrl = '/api/auth/login';
        console.log('Login URL:', loginUrl);
        
        const response = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Include cookies for session authentication
            body: JSON.stringify(formData)
        });
        
        console.log('Response received:', response.status, response.statusText);
        
        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            console.error('Failed to parse response as JSON:', jsonError);
            throw new Error('Server returned invalid response');
        }
        
        if (response.ok) {
            showMessage('Login successful! Redirecting...', 'success');
            
            console.log('Login response data:', data);
            
            // Store token if provided
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                console.log('Token stored');
            }
            
            // Store user info
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
                console.log('User data stored:', data.user);
            } else {
                console.error('No user data in response!');
                showMessage('Login response missing user data', 'error');
                return;
            }
            
            // Clear guest flag since this is a real user login
            localStorage.removeItem('isGuest');
            localStorage.removeItem('guestMessageCount');
            
            // Verify storage before redirect
            const storedUser = localStorage.getItem('user');
            console.log('Verified stored user:', storedUser);
            
            // Redirect to main chat interface
            setTimeout(() => {
                console.log('Redirecting to index.html');
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error details:', error);
        
        // Provide more specific error messages
        if (error.message.includes('Failed to fetch')) {
            showMessage('Cannot connect to server. Please check your internet connection and try again.', 'error');
            
            // Suggest opening network debug
            const debugLink = document.createElement('a');
            debugLink.href = 'network-debug.html';
            debugLink.textContent = 'Open Network Debug Tool';
            debugLink.style.color = '#00ff00';
            debugLink.style.display = 'block';
            debugLink.style.marginTop = '10px';
            document.getElementById('errorMessage').appendChild(debugLink);
        } else {
            showMessage(`Network error: ${error.message}`, 'error');
        }
    } finally {
        submitButton.disabled = false;
        submitButton.classList.remove('loading');
        submitButton.textContent = 'Login';
    }
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();
    
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.classList.add('loading');
    submitButton.textContent = 'Creating account...';
    
    const formData = {
        username: document.getElementById('signupUsername').value,
        email: document.getElementById('signupEmail').value,
        password: password
    };
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Include cookies for session authentication
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Account created successfully! Please log in.', 'success');
            
            // Switch to login form after 2 seconds
            setTimeout(() => {
                showLogin();
                document.getElementById('loginEmail').value = formData.email;
            }, 2000);
        } else {
            showMessage(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.classList.remove('loading');
        submitButton.textContent = 'Create Account';
    }
});

// Guest login
document.getElementById('guestButton').addEventListener('click', () => {
    // Set guest user in localStorage
    const guestUser = {
        id: 'guest',
        username: 'Guest',
        email: 'guest@newna.ai',
        isGuest: true,
        daily_message_count: 0,
        message_limit: 10
    };
    
    localStorage.setItem('user', JSON.stringify(guestUser));
    localStorage.setItem('isGuest', 'true');
    
    // Redirect to main app
    window.location.href = 'index.html';
});

// Check if already logged in
window.addEventListener('load', () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        // Verify token is still valid
        fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).then(response => {
            if (response.ok) {
                window.location.href = 'index.html';
            }
        }).catch(() => {
            // Token invalid, stay on login page
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
        });
    }
});