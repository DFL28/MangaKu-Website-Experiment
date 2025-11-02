// Generate a simple CSRF-like token (in a real app, this would come from the server)
async function generateCSRFToken() {
    try {
        const response = await fetch('/api/csrf-token');
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

document.getElementById('register-form').addEventListener('submit', async (event) => {
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
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token-ID': csrfTokenId,
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            // Show success message
            button.innerHTML = '<i class="fas fa-check"></i> Registrasi Berhasil!';
            button.style.backgroundColor = 'var(--success-color)';
            
            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Registrasi gagal');
        }
    } catch (error) {
        console.error('Registration error:', error);
        button.innerHTML = originalText;
        button.disabled = false;
        
        // Show error message
        alert('Registrasi gagal: ' + error.message);
    }
});