const { saveToFileCache, loadFromFileCache, hasValidFileCache, clearFileCache, getFileCacheStats } = require('./utils/fileCache');

async function testFileCache() {
    console.log('Testing file-based caching system...');
    
    // Test data
    const testKey = 'test_manga_data';
    const testData = {
        id: 'test-manga',
        title: 'Test Manga',
        chapters: [
            { id: 'ch1', title: 'Chapter 1', pages: 20 },
            { id: 'ch2', title: 'Chapter 2', pages: 25 }
        ],
        source: 'test'
    };
    
    // Save to cache
    console.log('Saving test data to cache...');
    await saveToFileCache(testKey, testData, 5000); // 5 seconds TTL
    
    // Check if cache exists
    const hasCache = await hasValidFileCache(testKey);
    console.log('Cache exists:', hasCache);
    
    // Load from cache
    console.log('Loading test data from cache...');
    const loadedData = await loadFromFileCache(testKey);
    console.log('Loaded data:', loadedData);
    
    // Wait for cache to expire
    console.log('Waiting for cache to expire...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Try to load expired cache
    console.log('Trying to load expired cache...');
    const expiredData = await loadFromFileCache(testKey);
    console.log('Expired data:', expiredData);
    
    // Get cache stats
    console.log('Getting cache stats...');
    const stats = await getFileCacheStats();
    console.log('Cache stats:', stats);
    
    // Clear cache
    console.log('Clearing cache...');
    await clearFileCache();
    
    console.log('File cache test completed!');
}

testFileCache().catch(console.error);