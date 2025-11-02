// ===== Vercel Serverless Function - Get Latest Updates =====
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
        const {
            source = 'all',
            limit = '100',
            lang = 'id',
            sort = 'latest'
        } = req.query;

        const limitNum = parseInt(limit) || 100;

        console.log(`[Vercel] Fetching updates - source: ${source}, limit: ${limitNum}`);

        let allUpdates = [];

        if (source === 'all') {
            // Fetch dari semua sources secara parallel (mangadex disabled - only for chapters)
            const sources = ['komiku', 'maid', 'bacamanga', 'kiryuu'];

            const cacheKey = `updates:all:${limitNum}`;
            allUpdates = await cache.cached(
                cacheKey,
                async () => {
                    const fetchPromises = sources.map(async (src) => {
                        try {
                            const scraper = SCRAPERS[src];
                            if (!scraper || !scraper.getMangaList) return [];

                            const results = await withTimeout(
                                scraper.getMangaList(1),
                                15000 // 15 detik per source
                            );

                            return (results || []).map(manga => ({
                                ...manga,
                                source: src
                            }));
                        } catch (error) {
                            console.warn(`[Updates] Error from ${src}:`, error.message);
                            return [];
                        }
                    });

                    const results = await Promise.allSettled(fetchPromises);

                    // Combine semua results
                    const combined = [];
                    for (const result of results) {
                        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
                            combined.push(...result.value);
                        }
                    }

                    // Deduplicate berdasarkan title + source
                    const seen = new Set();
                    const unique = [];
                    for (const manga of combined) {
                        const key = `${manga.title}-${manga.source}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            unique.push(manga);
                        }
                    }

                    // Sort by latest (bisa by rating atau random untuk testing)
                    return unique.slice(0, limitNum);
                },
                300 // Cache 5 menit
            );
        } else {
            // Fetch dari single source
            const scraper = SCRAPERS[source.toLowerCase()];
            if (!scraper || !scraper.getMangaList) {
                return res.status(400).json({
                    success: false,
                    error: `Source '${source}' tidak tersedia`
                });
            }

            const cacheKey = `updates:${source}:${limitNum}`;
            allUpdates = await cache.cached(
                cacheKey,
                async () => {
                    const results = await withTimeout(
                        scraper.getMangaList(1),
                        50000
                    );
                    return (results || []).slice(0, limitNum);
                },
                300
            );
        }

        // Cache response
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

        return res.status(200).json({
            success: true,
            data: allUpdates,
            count: allUpdates.length,
            source,
            limit: limitNum
        });

    } catch (error) {
        console.error('[Vercel] Error fetching updates:', error.message);

        return res.status(500).json({
            success: false,
            error: error.message || 'Terjadi kesalahan saat mengambil updates'
        });
    }
};
