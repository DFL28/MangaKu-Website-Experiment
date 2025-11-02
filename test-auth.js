// Test authentication functionality
async function testAuth() {
    console.log('Testing authentication system...');
    
    try {
        // Test registration
        console.log('1. Testing registration...');
        const registerResponse = await fetch('http://localhost:3000/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'testuser',
                password: 'testpass123'
            })
        });
        
        if (registerResponse.ok) {
            console.log('✓ Registration successful');
        } else {
            console.log('✗ Registration failed:', await registerResponse.text());
        }
        
        // Test login
        console.log('2. Testing login...');
        const loginResponse = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'testuser',
                password: 'testpass123'
            })
        });
        
        if (loginResponse.ok) {
            const { token } = await loginResponse.json();
            console.log('✓ Login successful');
            console.log('Token:', token.substring(0, 20) + '...');
            
            // Test accessing protected endpoint
            console.log('3. Testing protected endpoint...');
            const bookmarksResponse = await fetch('http://localhost:3000/api/user/bookmarks', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (bookmarksResponse.ok) {
                console.log('✓ Protected endpoint accessible');
            } else {
                console.log('✗ Protected endpoint access failed');
            }
        } else {
            console.log('✗ Login failed:', await loginResponse.text());
        }
        
        console.log('Authentication test completed!');
    } catch (error) {
        console.error('Test error:', error.message);
    }
}

testAuth();