// Test script for cache manager fixes
const CacheManager = require('./cache-manager');

// Mock localStorage for testing
global.localStorage = {
    _data: {},
    setItem: function(key, value) {
        // Simulate storage quota limit
        const totalSize = Object.values(this._data).reduce((sum, val) => sum + (val ? val.length : 0), 0);
        if (totalSize > 4000000) { // 4MB limit
            throw new Error('QuotaExceededError');
        }
        this._data[key] = value;
    },
    getItem: function(key) {
        return this._data[key] || null;
    },
    removeItem: function(key) {
        delete this._data[key];
    },
    clear: function() {
        this._data = {};
    }
};

// Test data
const testData = [];
for (let i = 0; i < 100; i++) {
    testData.push({
        id: `manga-${i}`,
        title: `Manga Title ${i}`,
        source: 'mangadex',
        cover: `https://example.com/cover-${i}.jpg`,
        genres: ['action', 'fantasy']
    });
}

async function testCacheManager() {
    console.log('=== Testing Cache Manager Fixes ===');
    
    try {
        // Initialize cache
        CacheManager.initIndex();
        console.log('✅ Cache index initialized');
        
        // Test saving batches with reduced size
        const result = CacheManager.saveBatch(testData, 'mangadex', 1);
        console.log(`✅ Save batch result: ${result}`);
        
        // Test getting cached data
        const cached = CacheManager.getAllCached('mangadex');
        console.log(`✅ Retrieved ${cached.length} cached items`);
        
        // Test cache stats
        const stats = CacheManager.getStats();
        console.log('✅ Cache stats:', JSON.stringify(stats, null, 2));
        
        // Test cleaning
        const cleaned = CacheManager.cleanOldCache();
        console.log(`✅ Cleaned ${cleaned} batches`);
        
        console.log('\n🎉 All cache manager tests passed!');
        return true;
    } catch (error) {
        console.error('❌ Cache manager test failed:', error.message);
        return false;
    }
}

testCacheManager().catch(console.error);