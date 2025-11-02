// Test bookmark functionality
async function testBookmark() {
    console.log('Testing bookmark system...');
    
    try {
        // First login to get a token
        console.log('1. Logging in...');
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
        
        if (!loginResponse.ok) {
            throw new Error('Login failed');
        }
        
        const { token } = await loginResponse.json();
        console.log('✓ Login successful');
        
        // Test adding a bookmark
        console.log('2. Adding bookmark...');
        const testManga = {
            id: 'test-manga-123',
            source: 'test-source',
            title: 'Test Manga',
            cover: 'https://placehold.co/300x400?text=Test+Manga',
            addedAt: new Date().toISOString()
        };
        
        const bookmarkResponse = await fetch('http://localhost:3000/api/user/bookmarks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ manga: testManga })
        });
        
        if (bookmarkResponse.ok) {
            console.log('✓ Bookmark added successfully');
        } else {
            console.log('✗ Failed to add bookmark:', await bookmarkResponse.text());
        }
        
        // Test retrieving bookmarks
        console.log('3. Retrieving bookmarks...');
        const bookmarksResponse = await fetch('http://localhost:3000/api/user/bookmarks', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (bookmarksResponse.ok) {
            const bookmarksData = await bookmarksResponse.json();
            console.log('✓ Bookmarks retrieved successfully');
            console.log('Bookmarks count:', bookmarksData.data.length);
        } else {
            console.log('✗ Failed to retrieve bookmarks:', await bookmarksResponse.text());
        }
        
        console.log('Bookmark test completed!');
    } catch (error) {
        console.error('Test error:', error.message);
    }
}

testBookmark();