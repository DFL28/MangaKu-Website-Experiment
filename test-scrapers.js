// ===== Test Script untuk Scrapers =====
// Jalankan: node test-scrapers.js

const mangadex = require('./scrapers/mangadex');
const komiku = require('./scrapers/komiku');
const maid = require('./scrapers/maid');
const bacamanga = require('./scrapers/bacamanga');

async function testMangaDex() {
    console.log('\n=== Testing MangaDex API ===');
    try {
        console.log('Fetching manga list...');
        const list = await mangadex.getMangaList({ limit: 5 });
        console.log(`Found ${list.length} manga`);
        if (list.length > 0) {
            console.log('Sample:', list[0].title);

            console.log('\nFetching manga detail...');
            const detail = await mangadex.getMangaDetail(list[0].id);
            console.log(`Detail loaded: ${detail ? 'Yes' : 'No'}`);

            console.log('\nFetching chapters...');
            const chapters = await mangadex.getChapters(list[0].id);
            console.log(`Found ${chapters.length} chapters`);

            if (chapters.length > 0) {
                console.log('\nFetching chapter pages...');
                const pages = await mangadex.getChapterPages(chapters[0].id);
                console.log(`Found ${pages.length} pages`);
            }
        }
    } catch (error) {
        console.error('MangaDex Error:', error.message);
    }
}

async function testKomiku() {
    console.log('\n=== Testing Komiku Scraper ===');
    try {
        console.log('Fetching manga list...');
        const list = await komiku.getMangaList(1);
        console.log(`Found ${list.length} manga`);
        if (list.length > 0) {
            console.log('Sample:', list[0].title, '- ID:', list[0].id);

            console.log('\nFetching manga detail...');
            const detail = await komiku.getMangaDetail(list[0].id);
            if (detail) {
                console.log(`Detail loaded: ${detail.title}`);
                console.log('   Author:', detail.author);
                console.log('   Status:', detail.status);
                console.log('   Genres:', detail.genres ? detail.genres.join(', ') : '');
            } else {
                console.log('No detail found');
            }
        }
    } catch (error) {
        console.error('Komiku Error:', error.message);
        console.error(error.stack);
    }
}

async function testMaid() {
    console.log('\n=== Testing Maid.my.id Scraper ===');
    try {
        console.log('Fetching manga list...');
        const list = await maid.getMangaList(1);
        console.log(`Found ${list.length} manga`);
        if (list.length > 0) {
            console.log('Sample:', list[0].title, '- ID:', list[0].id);
        }
    } catch (error) {
        console.error('Maid.my.id Error:', error.message);
        console.error(error.stack);
    }
}

async function testBacaManga() {
    console.log('\n=== Testing BacaManga Scraper ===');
    try {
        console.log('Fetching manga list...');
        const list = await bacamanga.getMangaList(1);
        console.log(`Found ${list.length} manga`);
        if (list.length > 0) {
            console.log('Sample:', list[0].title, '- ID:', list[0].id);
        }
    } catch (error) {
        console.error('BacaManga Error:', error.message);
        console.error(error.stack);
    }
}

async function testSearch() {
    console.log('\n=== Testing Search Function ===');
    try {
        console.log('Searching for "naruto" in MangaDex...');
        const results = await mangadex.searchManga('naruto', 3);
        console.log(`Found ${results.length} results`);
        results.forEach(r => console.log('  -', r.title));
    } catch (error) {
        console.error('Search Error:', error.message);
    }
}

async function runAllTests() {
    console.log('Starting Scraper Tests...\n');
    console.log('This may take a while due to rate limiting...\n');

    await testMangaDex();

    await new Promise(resolve => setTimeout(resolve, 2000));
    await testKomiku();

    await new Promise(resolve => setTimeout(resolve, 2000));
    await testMaid();

    await new Promise(resolve => setTimeout(resolve, 2000));
    await testBacaManga();

    await new Promise(resolve => setTimeout(resolve, 2000));
    await testSearch();

    console.log('\nAll tests completed!\n');
}

runAllTests().catch(console.error);