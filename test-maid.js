const axios = require('axios');
const cheerio = require('cheerio');

async function testMaidStructure() {
    try {
        console.log('Fetching maid.my.id...');
        const response = await axios.get('https://www.maid.my.id/manga/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });

        const $ = cheerio.load(response.data);

        console.log('\n=== Looking for manga cards ===');

        // Try different selectors
        const selectors = [
            'article.post',
            '.grid article',
            'div[class*="grid"] > div',
            '.manga-card',
            '.item-card'
        ];

        for (const selector of selectors) {
            const elements = $(selector);
            if (elements.length > 0) {
                console.log(`\nFound ${elements.length} elements with selector: ${selector}`);
                console.log('First 3:');
                elements.slice(0, 3).each((i, el) => {
                    const $el = $(el);
                    const classes = $el.attr('class');
                    const link = $el.find('a').first().attr('href');
                    const title = $el.find('a, h2, h3, .title').first().text().trim();
                    const img = $el.find('img').first().attr('src');
                    console.log(`  ${i+1}. class="${classes}"`);
                    console.log(`      link="${link}"`);
                    console.log(`      title="${title.substring(0, 40)}"`);
                    console.log(`      img="${img ? img.substring(0, 50) : ''}"`);
                });
            }
        }

        // Also check for main content area
        console.log('\n=== Main content area ===');
        const mainContent = $('main, #content, .main-content, .site-content').first();
        console.log('Main container:', mainContent.length > 0 ? mainContent.attr('class') || mainContent.prop('tagName') : 'NOT FOUND');

        if (mainContent.length > 0) {
            console.log('Direct children:', mainContent.children().length);
            mainContent.children().slice(0, 5).each((i, el) => {
                console.log(`  Child ${i+1}:`, $(el).attr('class') || $(el).prop('tagName'));
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testMaidStructure();
