const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

// Ensure cache directory exists
const CACHE_DIR = path.join(__dirname, '..', 'cache');
const MANGA_CACHE_DIR = path.join(CACHE_DIR, 'manga');

const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

async function ensureDirectory(dir) {
    try {
        await fs.access(dir);
    } catch {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            console.error('Error creating cache directory:', error);
        }
    }
}

async function ensureCacheDir() {
    await ensureDirectory(CACHE_DIR);
    await ensureDirectory(MANGA_CACHE_DIR);
}

// Initialize cache directory immediately
ensureCacheDir();

/**
 * Generate a safe filename from cache key
 * @param {string} key - Cache key
 * @returns {string} Safe filename
 */
function generateFilename(key) {
    // Replace invalid characters with underscores
    return key.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json.gz';
}

function getCacheDirForKey(key) {
    if (typeof key === 'string' && key.toLowerCase().startsWith('manga')) {
        return MANGA_CACHE_DIR;
    }
    return CACHE_DIR;
}

/**
 * Save data to file cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds (default: 30 minutes)
 */
async function saveToFileCache(key, data, ttl = 1800000) {
    try {
        // Ensure cache directory exists before saving
        await ensureCacheDir();
        
        const filename = generateFilename(key);
        const targetDir = getCacheDirForKey(key);
        await ensureDirectory(targetDir);
        const filepath = path.join(targetDir, filename);
        
        const cacheData = {
            data,
            expiry: Date.now() + ttl,
            createdAt: Date.now()
        };
        
        const serialized = JSON.stringify(cacheData);
        const compressed = await gzipAsync(serialized);
        await fs.writeFile(filepath, compressed);
    } catch (error) {
        console.error('Error saving to file cache:', error);
    }
}

/**
 * Load data from file cache
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null if not found/expired
 */
async function loadFromFileCache(key) {
    try {
        // Ensure cache directory exists
        await ensureCacheDir();
        
        const filename = generateFilename(key);
        const targetDir = getCacheDirForKey(key);
        const filepath = path.join(targetDir, filename);
        
        const legacyPath = filepath.replace(/\.json\.gz$/, '.json');
        let cacheData;
        try {
            const fileBuffer = await fs.readFile(filepath);
            const decompressed = await gunzipAsync(fileBuffer);
            cacheData = JSON.parse(decompressed.toString('utf8'));
        } catch (decompressError) {
            // Fallback for legacy JSON files
            try {
                const legacyData = await fs.readFile(legacyPath, 'utf8');
                cacheData = JSON.parse(legacyData);
            } catch {
                throw decompressError;
            }
        }
        
        // Check if expired
        if (Date.now() > cacheData.expiry) {
            // Delete expired cache
            await fs.unlink(filepath).catch(() => {});
            await fs.unlink(legacyPath).catch(() => {});
            return null;
        }
        
        return cacheData.data;
    } catch (error) {
        // File doesn't exist or other error
        return null;
    }
}

/**
 * Check if cache exists and is valid
 * @param {string} key - Cache key
 * @returns {boolean} True if cache exists and is valid
 */
async function hasValidFileCache(key) {
    try {
        const data = await loadFromFileCache(key);
        return data !== null;
    } catch {
        return false;
    }
}

/**
 * Clear file cache
 */
async function clearFileCache() {
    try {
        await ensureCacheDir();
        const entries = await fs.readdir(CACHE_DIR, { withFileTypes: true });
        for (const entry of entries) {
            const entryPath = path.join(CACHE_DIR, entry.name);
            if (entry.isDirectory()) {
                const nested = await fs.readdir(entryPath);
                await Promise.all(nested.map(file => fs.unlink(path.join(entryPath, file))));
            } else {
                await fs.unlink(entryPath);
            }
        }
    } catch (error) {
        console.error('Error clearing file cache:', error);
    }
}

/**
 * Get cache statistics
 */
async function getFileCacheStats() {
    try {
        await ensureCacheDir();
        const entries = await fs.readdir(CACHE_DIR, { withFileTypes: true });
        const stats = [];
        let count = 0;

        const pushStats = async (basePath, file, relativeDir = '') => {
            const filepath = path.join(basePath, file);
            const stat = await fs.stat(filepath);
            stats.push({
                file: relativeDir ? path.join(relativeDir, file) : file,
                size: stat.size,
                modified: stat.mtime
            });
            count++;
        };

        for (const entry of entries) {
            const entryPath = path.join(CACHE_DIR, entry.name);
            if (entry.isDirectory()) {
                const nestedFiles = await fs.readdir(entryPath);
                for (const nested of nestedFiles) {
                    try {
                        await pushStats(entryPath, nested, entry.name);
                    } catch (error) {
                        // Skip files that can't be accessed
                    }
                }
            } else {
                try {
                    await pushStats(CACHE_DIR, entry.name);
                } catch (error) {
                    // Skip files that can't be accessed
                }
            }
        }
        
        return {
            count,
            files: stats
        };
    } catch (error) {
        return {
            count: 0,
            files: []
        };
    }
}

module.exports = {
    saveToFileCache,
    loadFromFileCache,
    hasValidFileCache,
    clearFileCache,
    getFileCacheStats
};
