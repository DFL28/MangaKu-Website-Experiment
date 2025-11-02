// Test script for MangaDex scraper
const mangadex = require('./scrapers/mangadex');

async function testMangaDex() {
    console.log('=== Testing MangaDex API ===');
    try {
        console.log('Fetching manga list...');
        const list = await mangadex.getMangaList({ limit: 5 });
        console.log(`Found ${list.length} manga`);
        if (list.length > 0) {
            console.log('Sample:', list[0].title, '- ID:', list[0].id);

            console.log('\nFetching manga detail...');
            const detail = await mangadex.getMangaDetail(list[0].id);
            console.log(`Detail loaded: ${detail ? 'Yes' : 'No'}`);
            if (detail) {
                console.log('   Title:', detail.title);
                console.log('   Author:', detail.author);
                console.log('   Status:', detail.status);
            }

            console.log('\nFetching chapters...');
            const chapters = await mangadex.getChapters(list[0].id);
            console.log(`Found ${chapters.length} chapters`);
            if (chapters.length > 0) {
                console.log('   First chapter:', chapters[0].title);
                
                console.log('\nFetching chapter pages...');
                const pages = await mangadex.getChapterPages(chapters[0].id);
                console.log(`Found ${pages.length} pages`);
                if (pages.length > 0) {
                    console.log('   First page URL:', pages[0].url);
                }
            }
        }
    } catch (error) {
        console.error('MangaDex Error:', error.message);
        console.error(error.stack);
    }
}

async function testSearch() {
    console.log('\n=== Testing MangaDex Search ===');
    try {
        console.log('Searching for "naruto"...');
        const results = await mangadex.searchManga('naruto', { limit: 5 });
        console.log(`Found ${results.length} results`);
        results.forEach((r, i) => {
            if (i < 3) console.log('  -', r.title);
        });
    } catch (error) {
        console.error('Search Error:', error.message);
        console.error(error.stack);
    }
}

async function runTests() {
    console.log('Starting MangaDex Tests...\n');
    
    await testMangaDex();
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testSearch();
    
    console.log('\nAll MangaDex tests completed!\n');
}

runTests().catch(console.error);