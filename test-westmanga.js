// Test script for WestManga scraper
const westmanga = require('./scrapers/westmanga');

async function testWestManga() {
    console.log('=== Testing WestManga Scraper ===');
    
    try {
        console.log('Fetching manga list...');
        const list = await westmanga.getMangaList(1);
        console.log(`Found ${list.length} manga`);
        
        if (list.length > 0) {
            console.log('Sample:', list[0].title, '- ID:', list[0].id);
            
            console.log('\nFetching manga detail...');
            const detail = await westmanga.getMangaDetail(list[0].id);
            if (detail) {
                console.log(`Detail loaded: ${detail.title}`);
                console.log('   Author:', detail.author);
                console.log('   Status:', detail.status);
            } else {
                console.log('No detail found');
            }
        }
    } catch (error) {
        console.error('WestManga Error:', error.message);
        console.error(error.stack);
    }
    
    console.log('\nTest completed!');
}

testWestManga().catch(console.error);