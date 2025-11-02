// Generate a simple CSRF-like token (in a real app, this would come from the server)
async function generateCSRFToken() {
    try {
        const API_BASE = window.location.origin;
        const response = await fetch(`${API_BASE}/api/csrf-token`);
        if (response.ok) {
            const data = await response.json();
            return {
                tokenId: data.tokenId,
                token: data.token
            };
        }
    } catch (error) {
        console.error('Error generating CSRF token:', error);
    }
    return null;
}

// Set CSRF token on page load
document.addEventListener('DOMContentLoaded', async () => {
    const csrfData = await generateCSRFToken();
    if (csrfData) {
        document.getElementById('csrf-token-id').value = csrfData.tokenId;
        document.getElementById('csrf-token').value = csrfData.token;
    }
});

document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const csrfTokenId = document.getElementById('csrf-token-id').value;
    const csrfToken = document.getElementById('csrf-token').value;
    const button = document.querySelector('.auth-btn');
    const originalText = button.innerHTML;

    // Show loading state
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    button.disabled = true;

    try {
        // Get API base URL (works for both local and Vercel)
        const API_BASE = window.location.origin;

        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token-ID': csrfTokenId,
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const { token, role } = await response.json();
            localStorage.setItem('token', token);
            
            // Show success message
            button.innerHTML = '<i class="fas fa-check"></i> Login Berhasil!';
            button.style.backgroundColor = 'var(--success-color)';
            
            // Redirect based on role
            setTimeout(() => {
                if (role === 'admin') {
                    window.location.href = 'admin.html';  // Admin dashboard
                } else {
                    window.location.href = 'index.html';
                }
            }, 1000);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Login gagal');
        }
    } catch (error) {
        console.error('Login error:', error);
        button.innerHTML = originalText;
        button.disabled = false;
        button.style.backgroundColor = ''; // Reset background color
        
        // Show error message
        alert('Login gagal: ' + error.message);
    }
});

// Add keyboard support for back button
document.addEventListener('keydown', function(event) {
    // ESC key to go back
    if (event.key === 'Escape') {
        window.history.back();
    }
});