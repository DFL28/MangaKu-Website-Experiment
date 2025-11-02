// Script to reset admin password
// Run this script from the command line: node reset-admin-password.js <new-password>

const http = require('http');

// Get new password from command line arguments
const newPassword = process.argv[2];

if (!newPassword) {
    console.log('Usage: node reset-admin-password.js <new-password>');
    console.log('Example: node reset-admin-password.js myNewPassword123');
    process.exit(1);
}

// Send request to reset admin password
const postData = JSON.stringify({
    newPassword: newPassword
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/reset-admin-password',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            if (result.success) {
                console.log('✅ Success:', result.message);
                console.log('🔐 New admin password:', newPassword);
                console.log('📝 Remember to change this password after login for security!');
            } else {
                console.log('❌ Error:', result.message);
            }
        } catch (error) {
            console.log('❌ Error parsing response:', error.message);
        }
    });
});

req.on('error', (error) => {
    console.log('❌ Error connecting to server:', error.message);
    console.log('💡 Make sure the server is running on port 3000');
});

req.write(postData);
req.end();