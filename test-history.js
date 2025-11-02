// Test history functionality
async function testHistory() {
    console.log('Testing history system...');
    
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
        
        // Test adding to history
        console.log('2. Adding to history...');
        const testChapter = {
            mangaId: 'test-manga-123',
            source: 'test-source',
            title: 'Test Manga',
            cover: 'https://placehold.co/300x400?text=Test+Manga',
            lastChapterId: 'chapter-1',
            lastChapterNumber: 1,
            readAt: new Date().toISOString()
        };
        
        const historyResponse = await fetch('http://localhost:3000/api/user/history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ chapter: testChapter })
        });
        
        if (historyResponse.ok) {
            console.log('✓ History entry added successfully');
        } else {
            console.log('✗ Failed to add history entry:', await historyResponse.text());
        }
        
        // Test retrieving history
        console.log('3. Retrieving history...');
        const historyResponse2 = await fetch('http://localhost:3000/api/user/history', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (historyResponse2.ok) {
            const historyData = await historyResponse2.json();
            console.log('✓ History retrieved successfully');
            console.log('History count:', historyData.data.length);
        } else {
            console.log('✗ Failed to retrieve history:', await historyResponse2.text());
        }
        
        console.log('History test completed!');
    } catch (error) {
        console.error('Test error:', error.message);
    }
}

testHistory();