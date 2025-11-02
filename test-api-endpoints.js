// Test script for API endpoints
const axios = require('axios');

async function testMangaList() {
    console.log('=== Testing Manga List API ===');
    try {
        const response = await axios.get('http://localhost:3000/api/manga?source=mangadex&limit=5');
        console.log(`Found ${response.data.data.length} manga`);
        if (response.data.data.length > 0) {
            console.log('Sample:', response.data.data[0].title);
        }
        return true;
    } catch (error) {
        console.error('Manga List API Error:', error.message);
        return false;
    }
}

async function testMangaDetail() {
    console.log('\n=== Testing Manga Detail API ===');
    try {
        // First get a manga ID
        const listResponse = await axios.get('http://localhost:3000/api/manga?source=mangadex&limit=1');
        if (listResponse.data.data.length > 0) {
            const mangaId = listResponse.data.data[0].id;
            console.log('Testing with manga ID:', mangaId);
            
            const response = await axios.get(`http://localhost:3000/api/manga/${mangaId}?source=mangadex`);
            console.log(`Detail loaded: ${response.data.success ? 'Yes' : 'No'}`);
            if (response.data.data) {
                console.log('Title:', response.data.data.title);
            }
            return true;
        } else {
            console.log('No manga found to test detail');
            return false;
        }
    } catch (error) {
        console.error('Manga Detail API Error:', error.message);
        return false;
    }
}

async function testChapters() {
    console.log('\n=== Testing Chapters API ===');
    try {
        // First get a manga ID
        const listResponse = await axios.get('http://localhost:3000/api/manga?source=mangadex&limit=1');
        if (listResponse.data.data.length > 0) {
            const mangaId = listResponse.data.data[0].id;
            console.log('Testing with manga ID:', mangaId);
            
            const response = await axios.get(`http://localhost:3000/api/manga/${mangaId}/chapters?source=mangadex`);
            console.log(`Found ${response.data.data.length} chapters`);
            return true;
        } else {
            console.log('No manga found to test chapters');
            return false;
        }
    } catch (error) {
        console.error('Chapters API Error:', error.message);
        return false;
    }
}

async function testChapterPages() {
    console.log('\n=== Testing Chapter Pages API ===');
    try {
        // First get a manga ID and chapter ID
        const listResponse = await axios.get('http://localhost:3000/api/manga?source=mangadex&limit=1');
        if (listResponse.data.data.length > 0) {
            const mangaId = listResponse.data.data[0].id;
            
            // Get chapters
            const chaptersResponse = await axios.get(`http://localhost:3000/api/manga/${mangaId}/chapters?source=mangadex`);
            if (chaptersResponse.data.data.length > 0) {
                const chapterId = chaptersResponse.data.data[0].id;
                console.log('Testing with chapter ID:', chapterId);
                
                const response = await axios.get(`http://localhost:3000/api/manga/${mangaId}/chapter/${chapterId}?source=mangadex`);
                console.log(`Found ${response.data.data.length} pages`);
                return true;
            } else {
                console.log('No chapters found to test pages');
                return false;
            }
        } else {
            console.log('No manga found to test pages');
            return false;
        }
    } catch (error) {
        console.error('Chapter Pages API Error:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('Starting API Endpoint Tests...\n');
    
    // Check if server is running
    try {
        await axios.get('http://localhost:3000/api/health');
        console.log('✅ Server is running\n');
    } catch (error) {
        console.log('❌ Server is not running. Please start the server first.');
        return;
    }
    
    const results = [];
    
    results.push({ name: 'Manga List', success: await testMangaList() });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    results.push({ name: 'Manga Detail', success: await testMangaDetail() });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    results.push({ name: 'Chapters', success: await testChapters() });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    results.push({ name: 'Chapter Pages', success: await testChapterPages() });

    console.log('\n=== Test Results Summary ===');
    results.forEach(result => {
        console.log(`${result.name}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    });

    console.log('\nAll API tests completed!\n');
}

runTests().catch(console.error);