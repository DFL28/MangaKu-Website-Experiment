// ===== Vercel Serverless Function - Get Manga List =====
const mangadex = require('../scrapers/mangadex');
const komiku = require('../scrapers/komiku');
const maid = require('../scrapers/maid-direct');
const bacamanga = require('../scrapers/bacamanga');
const kiryuu = require('../scrapers/kiryuu');
const jikan = require('../scrapers/jikan');
const cache = require('../utils/vercelCache');

const SCRAPERS = {
    mangadex,
    komiku,
    maid,
    bacamanga,
    kiryuu,
    jikan
};

// Helper untuk timeout
const withTimeout = (promise, ms) => {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), ms)
        )
    ]);
};

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { source = 'mangadex', page = '1' } = req.query;
        const pageNum = parseInt(page) || 1;

        console.log(`[Vercel] Fetching manga list - source: ${source}, page: ${pageNum}`);

        const scraper = SCRAPERS[source.toLowerCase()];
        if (!scraper) {
            return res.status(400).json({
                success: false,
                error: `Source '${source}' tidak tersedia`
            });
        }

        // Gunakan cache jika tersedia
        const cacheKey = `manga:${source}:${pageNum}`;
        const mangaList = await cache.cached(
            cacheKey,
            async () => {
                // Timeout 50 detik (Vercel limit 60 detik)
                return await withTimeout(
                    scraper.getMangaList(pageNum),
                    50000
                );
            },
            300 // Cache 5 menit
        );

        // Cache response selama 5 menit
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

        return res.status(200).json({
            success: true,
            data: mangaList || [],
            source,
            page: pageNum,
            count: mangaList ? mangaList.length : 0
        });

    } catch (error) {
        console.error('[Vercel] Error fetching manga list:', error.message);

        return res.status(500).json({
            success: false,
            error: error.message || 'Terjadi kesalahan saat mengambil data manga',
            source: req.query.source || 'unknown'
        });
    }
};
