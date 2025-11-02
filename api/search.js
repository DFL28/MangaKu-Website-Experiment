// ===== Vercel Serverless Function - Search Manga =====
const mangadex = require('../scrapers/mangadex');
const komiku = require('../scrapers/komiku');
const maid = require('../scrapers/maid-direct');
const bacamanga = require('../scrapers/bacamanga');
const kiryuu = require('../scrapers/kiryuu');
const jikan = require('../scrapers/jikan');

const SCRAPERS = {
    mangadex,
    komiku,
    maid,
    bacamanga,
    kiryuu,
    jikan
};

const withTimeout = (promise, ms) => {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), ms)
        )
    ]);
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { q, source = 'mangadex', page = '1' } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Query pencarian minimal 2 karakter'
            });
        }

        const pageNum = parseInt(page) || 1;

        console.log(`[Vercel] Searching manga - query: ${q}, source: ${source}, page: ${pageNum}`);

        const scraper = SCRAPERS[source.toLowerCase()];
        if (!scraper || !scraper.searchManga) {
            return res.status(400).json({
                success: false,
                error: `Source '${source}' tidak tersedia atau tidak support search`
            });
        }

        const results = await withTimeout(
            scraper.searchManga(q, pageNum),
            50000
        );

        // Cache search selama 15 menit
        res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');

        return res.status(200).json({
            success: true,
            data: results || [],
            query: q,
            source,
            page: pageNum,
            count: results ? results.length : 0
        });

    } catch (error) {
        console.error('[Vercel] Error searching manga:', error.message);

        return res.status(500).json({
            success: false,
            error: error.message || 'Terjadi kesalahan saat mencari manga'
        });
    }
};
