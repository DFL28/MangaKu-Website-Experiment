const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testApiCache() {
    console.log('Testing API caching system...');
    
    try {
        // Test getting manga list
        console.log('Testing manga list endpoint...');
        const mangaListResponse = await axios.get(`${API_BASE}/manga?source=komiku&page=1`);
        console.log('Manga list response:', {
            success: mangaListResponse.data.success,
            dataLength: mangaListResponse.data.data.length,
            cached: mangaListResponse.data.cached,
            cacheType: mangaListResponse.data.cacheType
        });
        
        // Test getting cache stats
        console.log('Testing cache stats endpoint...');
        const cacheStatsResponse = await axios.get(`${API_BASE}/cache/stats`);
        console.log('Cache stats:', cacheStatsResponse.data.data);
        
        console.log('API cache test completed!');
    } catch (error) {
        console.error('API test error:', error.message);
    }
}

testApiCache();