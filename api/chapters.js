// ===== Vercel Serverless Function - Get Chapters =====
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
        const { id, source = 'mangadex' } = req.query;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Parameter ID manga diperlukan'
            });
        }

        console.log(`[Vercel] Fetching chapters - id: ${id}, source: ${source}`);

        const scraper = SCRAPERS[source.toLowerCase()];
        if (!scraper || !scraper.getChapters) {
            return res.status(400).json({
                success: false,
                error: `Source '${source}' tidak tersedia atau tidak support chapters`
            });
        }

        const chapters = await withTimeout(
            scraper.getChapters(id),
            50000
        );

        // Cache selama 30 menit
        res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

        return res.status(200).json({
            success: true,
            data: chapters || [],
            source,
            count: chapters ? chapters.length : 0
        });

    } catch (error) {
        console.error('[Vercel] Error fetching chapters:', error.message);

        return res.status(500).json({
            success: false,
            error: error.message || 'Terjadi kesalahan saat mengambil daftar chapter'
        });
    }
};
