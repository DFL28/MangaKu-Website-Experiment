// ===== Maid.my.id Direct Scraper (No ScraperAPI) =====
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.maid.my.id';

// Simple axios instance with headers
const client = axios.create({
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }
});

// ===== Helper Functions =====
async function fetchHTML(url) {
    try {
        console.log(`[Maid] Fetching: ${url}`);
        const response = await client.get(url);
        return response.data;
    } catch (error) {
        console.error(`[Maid] Fetch error for ${url}:`, error.message);
        throw error;
    }
}

function cleanText(text) {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ');
}

function extractSlug(url) {
    const match = url.match(/\/manga\/([^\/]+)/);
    return match ? match[1] : '';
}

function pickImage(el) {
    if (!el || !el.length) return '';

    const attrs = ['data-src', 'data-lazy-src', 'src', 'data-srcset', 'srcset'];
    for (const attr of attrs) {
        const val = el.attr(attr);
        if (val) {
            // If srcset, take first URL
            const url = val.split(',')[0].trim().split(' ')[0];
            if (url && url.startsWith('http')) return url;
        }
    }
    return '';
}

function normalizeUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return BASE_URL + url;
    return url;
}

// ===== Get Manga List =====
async function getMangaList(page = 1) {
    try {
        const url = `${BASE_URL}/manga/page/${page}/?m_orderby=latest`;
        console.log(`[Maid] Loading manga list page ${page}...`);

        const html = await fetchHTML(url);
        const mangaList = parseList(html);
        console.log(`[Maid] Found ${mangaList.length} manga`);
        return mangaList;
    } catch (error) {
        console.error('[Maid] getMangaList error:', error.message);
        return [];
    }
}

// ===== Get Manga Detail =====
async function getMangaDetail(mangaId) {
    try {
        const url = `${BASE_URL}/manga/${mangaId}/`;
        console.log(`[Maid] Loading detail: ${mangaId}`);

        const html = await fetchHTML(url);
        const $ = cheerio.load(html);

        const title = cleanText($('.entry-title, .post-title h1').first().text());
        if (!title) {
            console.error('[Maid] Title not found');
            return null;
        }

        const $cover = $('.summary_image img, .thumb img').first();
        const cover = normalizeUrl(pickImage($cover));

        const altTitle = cleanText($('.alternative').text().replace(/Alternative\s*:?\s*/i, ''));

        const rating = cleanText($('.rating-prc .score, .post-total-rating .score').first().text()) || '7.5';

        // Extract info from table
        const info = {};
        $('.post-content_item, .summary-content .post-content_item').each((_, el) => {
            const $el = $(el);
            const label = cleanText($el.find('.summary-heading h5, .summary-heading').first().text());
            const value = cleanText($el.find('.summary-content').first().text());
            if (label && value) {
                info[label.toLowerCase()] = value;
            }
        });

        const status = info['status'] || info['status rilis'] || 'Ongoing';
        const author = info['author'] || info['pengarang'] || info['penulis'] || 'Unknown';
        const artist = info['artist'] || info['seniman'] || author;
        const type = info['type'] || info['jenis'] || 'Manga';

        // Extract genres
        const genres = [];
        $('.genres-content a, .mgen a').each((_, el) => {
            const genre = cleanText($(el).text());
            if (genre) genres.push(genre);
        });

        // Extract description
        const description = cleanText(
            $('.summary__content p, .entry-content p, .description p').first().text()
        ) || 'No description available';

        console.log(`[Maid] Detail loaded: ${title}`);

        return {
            id: mangaId,
            title,
            altTitle,
            cover,
            coverFull: cover,
            rating,
            status,
            type,
            author,
            artist,
            genres,
            description,
            source: 'maid',
            url
        };
    } catch (error) {
        console.error('[Maid] getMangaDetail error:', error.message);
        return null;
    }
}

// ===== Get Chapters =====
async function getChapters(mangaId) {
    try {
        const url = `${BASE_URL}/manga/${mangaId}/`;
        console.log(`[Maid] Loading chapters: ${mangaId}`);

        const html = await fetchHTML(url);
        const $ = cheerio.load(html);
        const chapters = [];

        // Try multiple chapter list selectors
        $('.wp-manga-chapter, .listing-chapters_wrap li, #chapterlist li, .eplister ul li').each((_, element) => {
            try {
                const $el = $(element);
                const $link = $el.find('a').first();

                if (!$link.length) return;

                const chapterUrl = $link.attr('href');
                const chapterText = cleanText($link.text());

                if (!chapterUrl || !chapterText) return;

                // Extract chapter number
                const chapterMatch = chapterText.match(/chapter\s*([\d.]+)/i);
                const chapterNum = chapterMatch ? parseFloat(chapterMatch[1]) : 0;

                // Extract date
                const $date = $el.find('.chapter-release-date, .chapterdate').first();
                const date = cleanText($date.text()) || new Date().toISOString();

                chapters.push({
                    id: extractSlug(chapterUrl),
                    title: chapterText,
                    number: chapterNum,
                    date,
                    url: chapterUrl,
                    isNew: isNewChapter(date)
                });
            } catch (error) {
                console.error('[Maid] Error parsing chapter:', error.message);
            }
        });

        // Sort chapters by number in descending order (newest first)
        chapters.sort((a, b) => b.number - a.number);

        console.log(`[Maid] Found ${chapters.length} chapters`);
        return chapters;
    } catch (error) {
        console.error('[Maid] getChapters error:', error.message);
        return [];
    }
}

// ===== Get Chapter Pages =====
async function getChapterPages(chapterId) {
    try {
        // chapterId might be full URL or just slug
        const url = chapterId.startsWith('http') ? chapterId : `${BASE_URL}/${chapterId}/`;
        console.log(`[Maid] Loading chapter pages: ${url}`);

        const html = await fetchHTML(url);
        const $ = cheerio.load(html);
        const pages = [];

        // Try multiple reader area selectors
        $('#readerarea img, .reading-content img, .reader-area img, .entry-content img').each((_, element) => {
            const $img = $(element);
            const imgUrl = normalizeUrl(pickImage($img));

            if (imgUrl && imgUrl.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
                pages.push({
                    page: pages.length + 1,
                    url: imgUrl
                });
            }
        });

        console.log(`[Maid] Found ${pages.length} pages`);
        return pages;
    } catch (error) {
        console.error('[Maid] getChapterPages error:', error.message);
        return [];
    }
}

// ===== Search Manga =====
async function searchManga(query) {
    try {
        const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`;
        console.log(`[Maid] Searching: ${query}`);

        const html = await fetchHTML(url);
        const results = parseList(html);
        console.log(`[Maid] Search found ${results.length} results`);
        return results;
    } catch (error) {
        console.error('[Maid] searchManga error:', error.message);
        return [];
    }
}

// ===== Get Popular Manga =====
async function getPopularManga(limit = 20) {
    try {
        const url = `${BASE_URL}/manga/?m_orderby=views`;
        console.log(`[Maid] Loading popular manga...`);

        const html = await fetchHTML(url);
        const popular = parseList(html).slice(0, limit);
        console.log(`[Maid] Found ${popular.length} popular manga`);
        return popular;
    } catch (error) {
        console.error('[Maid] getPopularManga error:', error.message);
        return [];
    }
}

module.exports = {
    getMangaList,
    getMangaDetail,
    getChapters,
    getChapterPages,
    searchManga,
    getPopularManga
};

// ===== Internal Parsing Helpers =====
function parseList(html) {
    if (!html || typeof html !== 'string' || html.length < 400) {
        return [];
    }

    const $ = cheerio.load(html);
    const seen = new Set();
    const entries = [];

    const selectors = [
        '.listupd .bs',
        '.listupd .bsx',
        '.page-item-detail',
        '.row.c-tabs-item__content',
        '.c-tabs-item__content',
        '.flexbox2-item',
        '.flexbox3-item',
        '.mangalist-item',
        '.manga-item'
    ];

    selectors.forEach(selector => {
        $(selector).each((_, element) => {
            const mapped = mapCard($, $(element), seen);
            if (mapped) entries.push(mapped);
        });
    });

    return entries;
}

function mapCard($, $element, seen) {
    if (!$element || !$element.length) return null;

    const linkSelectors = [
        '.post-title a',
        'h3 a',
        'h2 a',
        '.item-thumb a',
        '.flexbox2-content > a',
        '.flexbox3-content > a',
        'a'
    ];
    let $link = null;
    for (const selector of linkSelectors) {
        const candidate = $element.find(selector).first();
        if (candidate && candidate.length) {
            $link = candidate;
            break;
        }
    }
    if (!$link) return null;

    const href = $link.attr('href');
    const title = cleanText($link.text() || $link.attr('title'));
    if (!href || !title) return null;

    const slug = extractSlug(href);
    if (!slug || seen.has(slug)) return null;
    seen.add(slug);

    const $img = $element.find('img').first();
    const cover = normalizeUrl(pickImage($img));

    const rating =
        cleanText(
            $element
                .find('.rating .numscore, .score, .post-total-rating, .num')
                .first()
                .text()
        ) || '7.5';

    const type = cleanText(
        $element.find('.manga-type, .type, .series-type').first().text()
    ) || 'Manga';

    const latestChapterRaw = cleanText(
        $element
            .find('.chapter a, .chapter, .latest-chap a, .season')
            .first()
            .text()
    );
    const latestChapter = latestChapterRaw
        .replace(/(Chapter|Ch\.?)/i, '')
        .replace(/\s+/g, ' ')
        .trim();

    return {
        id: slug,
        title,
        cover,
        rating,
        type,
        latestChapter,
        source: 'maid',
        url: normalizeUrl(href)
    };
}

// ===== Helper Functions =====
function isNewChapter(dateStr) {
    try {
        const chapterDate = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - chapterDate) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    } catch (error) {
        return false;
    }
}