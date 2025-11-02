// Detailed test script for all scrapers
const mangadex = require('./scrapers/mangadex');
const komiku = require('./scrapers/komiku');
const maid = require('./scrapers/maid');
const bacamanga = require('./scrapers/bacamanga');

async function testMangaDex() {
    console.log('=== Testing MangaDex API ===');
    try {
        console.log('Fetching manga list...');
        const startTime = Date.now();
        const list = await mangadex.getMangaList({ limit: 3 });
        const endTime = Date.now();
        console.log(`Found ${list.length} manga in ${endTime - startTime}ms`);
        if (list.length > 0) {
            console.log('Sample:', list[0].title, '- ID:', list[0].id);
        }
        return true;
    } catch (error) {
        console.error('MangaDex Error:', error.message);
        return false;
    }
}

async function testKomiku() {
    console.log('\n=== Testing Komiku Scraper ===');
    try {
        console.log('Fetching manga list...');
        const startTime = Date.now();
        const list = await komiku.getMangaList(1);
        const endTime = Date.now();
        console.log(`Found ${list.length} manga in ${endTime - startTime}ms`);
        if (list.length > 0) {
            console.log('Sample:', list[0].title, '- ID:', list[0].id);
        }
        return true;
    } catch (error) {
        console.error('Komiku Error:', error.message);
        return false;
    }
}

async function testMaid() {
    console.log('\n=== Testing Maid.my.id Scraper ===');
    try {
        console.log('Fetching manga list...');
        const startTime = Date.now();
        const list = await maid.getMangaList(1);
        const endTime = Date.now();
        console.log(`Found ${list.length} manga in ${endTime - startTime}ms`);
        if (list.length > 0) {
            console.log('Sample:', list[0].title, '- ID:', list[0].id);
        }
        return true;
    } catch (error) {
        console.error('Maid.my.id Error:', error.message);
        return false;
    }
}

async function testBacaManga() {
    console.log('\n=== Testing BacaManga Scraper ===');
    try {
        console.log('Fetching manga list...');
        const startTime = Date.now();
        const list = await bacamanga.getMangaList(1);
        const endTime = Date.now();
        console.log(`Found ${list.length} manga in ${endTime - startTime}ms`);
        if (list.length > 0) {
            console.log('Sample:', list[0].title, '- ID:', list[0].id);
        }
        return true;
    } catch (error) {
        console.error('BacaManga Error:', error.message);
        return false;
    }
}

async function runAllTests() {
    console.log('Starting Detailed Scraper Tests...\n');

    const results = [];
    
    results.push({ name: 'MangaDex', success: await testMangaDex() });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    results.push({ name: 'Komiku', success: await testKomiku() });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    results.push({ name: 'Maid', success: await testMaid() });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    results.push({ name: 'BacaManga', success: await testBacaManga() });

    console.log('\n=== Test Results Summary ===');
    results.forEach(result => {
        console.log(`${result.name}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    });

    console.log('\nAll tests completed!\n');
}

runAllTests().catch(console.error);