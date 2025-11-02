// Test script for direct connections only
const { fetchWithScraperAPI } = require('./utils/httpClient');
const komiku = require('./scrapers/komiku');
const maid = require('./scrapers/maid');
const bacamanga = require('./scrapers/bacamanga');

async function testDirectConnection() {
    console.log('=== Testing Direct Connection ===');
    try {
        const html = await fetchWithScraperAPI('https://komiku.id');
        console.log(`Direct fetch successful, received ${html.length} characters`);
    } catch (error) {
        console.error('Direct connection test failed:', error.message);
    }
}

async function testKomikuScraper() {
    console.log('\n=== Testing Komiku Scraper (Direct Only) ===');
    try {
        console.log('Fetching manga list...');
        const list = await komiku.getMangaList(1);
        console.log(`Found ${list.length} manga`);
        if (list.length > 0) {
            console.log('Sample:', list[0].title, '- ID:', list[0].id);
        }
    } catch (error) {
        console.error('Komiku Scraper Error:', error.message);
    }
}

async function testMaidScraper() {
    console.log('\n=== Testing Maid Scraper (Direct Only) ===');
    try {
        console.log('Fetching manga list...');
        const list = await maid.getMangaList(1);
        console.log(`Found ${list.length} manga`);
        if (list.length > 0) {
            console.log('Sample:', list[0].title, '- ID:', list[0].id);
        }
    } catch (error) {
        console.error('Maid Scraper Error:', error.message);
    }
}

async function testBacaMangaScraper() {
    console.log('\n=== Testing BacaManga Scraper (Direct Only) ===');
    try {
        console.log('Fetching manga list...');
        const list = await bacamanga.getMangaList(1);
        console.log(`Found ${list.length} manga`);
        if (list.length > 0) {
            console.log('Sample:', list[0].title, '- ID:', list[0].id);
        }
    } catch (error) {
        console.error('BacaManga Scraper Error:', error.message);
    }
}

async function runAllTests() {
    console.log('Starting Direct Connection Tests...\n');

    await testDirectConnection();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testKomikuScraper();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testMaidScraper();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testBacaMangaScraper();

    console.log('\nAll direct connection tests completed!\n');
}

runAllTests().catch(console.error);