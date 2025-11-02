const axios = require('axios');
const { Agent } = require('http');
const { Agent: HttpsAgent } = require('https');
const { proxyManager } = require('./proxyManager');

/**
 * ScraperAPI Configuration
 * API Key: ff7139272e2c699c7cd9adafacb7497a
 */
const SCRAPER_API_KEY = 'ff7139272e2c699c7cd9adafacb7497a';
const SCRAPER_API_URL = 'http://api.scraperapi.com';

/**
 * HTTP Client with connection pooling and keep-alive
 */
const httpAgent = new Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000
});

const httpsAgent = new HttpsAgent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000
});

const axiosInstance = axios.create({
    httpAgent,
    httpsAgent,
    timeout: 15000, // Increased timeout to 15s
    maxRedirects: 5
});

/**
 * Fetch URL using direct connection only (ScraperAPI disabled)
 * @param {string} url - Target URL to scrape
 * @param {object} options - Additional options
 * @returns {Promise<string>} HTML content
 */
async function fetchWithScraperAPI(url, options = {}) {
    const {
        forceScraper = false,
        preferDirect = true,
        directRetries = 3, // Increased retries
        minLength = 400,
        headers: customHeaders = {},
        scraperOnlyHeaders,
        ...scraperOptions
    } = options;

    const requestHeaders = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        ...customHeaders
    };

    // Always use direct fetch - ScraperAPI disabled
    console.log(`[Direct] Fetching: ${url}`);
    const directResult = await attemptDirectFetch(url, requestHeaders, directRetries, minLength);
    if (directResult) {
        return directResult;
    }
    
    throw new Error('Direct fetch failed');
}

/**
 * Fetch URL directly (for APIs like MangaDex)
 * @param {string} url - Target URL
 * @param {object} config - Axios config
 * @returns {Promise<object>} Response data
 */
async function fetchDirect(url, config = {}) {
    try {
        const response = await axiosInstance.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/html, */*',
                'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
                ...config.headers
            },
            ...config
        });
        return response.data;
    } catch (error) {
        console.error(`❌ Direct fetch error for ${url}:`, error.message);
        throw error;
    }
}

/**
 * Parallel async requests with concurrency limit
 * @param {Array} urls - Array of URLs to fetch
 * @param {Function} fetchFn - Fetch function to use
 * @param {number} concurrency - Max concurrent requests (default: 10)
 * @returns {Promise<Array>} Array of results
 */
async function fetchParallel(urls, fetchFn, concurrency = 10) {
    const results = [];
    const executing = [];

    for (const [index, url] of urls.entries()) {
        const promise = Promise.resolve().then(() => fetchFn(url, index));
        results.push(promise);

        if (urls.length >= concurrency) {
            const e = promise.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= concurrency) {
                await Promise.race(executing);
            }
        }
    }

    return Promise.allSettled(results);
}

/**
 * Batch process items with async function
 * @param {Array} items - Items to process
 * @param {Function} processFn - Async function to process each item
 * @param {number} batchSize - Batch size (default: 10)
 * @returns {Promise<Array>} Array of results
 */
async function batchProcess(items, processFn, batchSize = 10) {
    const results = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
            batch.map(item => processFn(item))
        );
        results.push(...batchResults);

        // Small delay between batches to avoid overwhelming the server
        if (i + batchSize < items.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return results;
}

/**
 * Retry wrapper for failed requests
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Max retry attempts (default: 3)
 * @param {number} delay - Delay between retries in ms (default: 1000)
 * @returns {Promise} Result of the function
 */
async function withRetry(fn, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }

    throw lastError;
}


// ===== Internal Helpers =====
async function attemptDirectFetch(url, headers, retries, minLength) {
    let lastError = null;

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await proxyManager.fetchWithProxy(url, {
                responseType: 'text',
                transformResponse: [data => data],
                decompress: true,
                timeout: 15000, // Increased timeout
                headers
            });

            if (response && typeof response.data === 'string') {
                const trimmed = response.data.trim();
                if (trimmed.length >= minLength && !looksBlocked(trimmed)) {
                    return trimmed;
                }
            }

            lastError = new Error('Direct fetch returned empty or blocked HTML');
        } catch (error) {
            lastError = error;
            if (attempt < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1))); // Reduced delay
            }
        }
    }

    if (lastError) {
        console.warn(`⚠️ Direct fetch failed for ${url}: ${lastError.message}`);
    }

    return null;
}

function looksBlocked(html) {
    const snippet = html.slice(0, 500).toLowerCase();
    return snippet.includes('captcha') ||
        snippet.includes('cloudflare') ||
        snippet.includes('access denied') ||
        snippet.includes('just a moment');
}

module.exports = {
    fetchWithScraperAPI,
    fetchDirect,
    fetchParallel,
    batchProcess,
    withRetry,
    axiosInstance
};
