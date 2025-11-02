// ===== Vercel KV Cache Helper (Optional) =====
// Install: npm install @vercel/kv
// Setup: Tambahkan Vercel KV di dashboard Vercel

let kv = null;

try {
    // Coba import @vercel/kv jika tersedia
    kv = require('@vercel/kv');
    console.log('[Cache] Vercel KV tersedia');
} catch (error) {
    console.log('[Cache] Vercel KV tidak tersedia, menggunakan in-memory cache');
}

// Fallback in-memory cache untuk local development
const memoryCache = new Map();

// Helper functions
async function get(key) {
    if (kv) {
        try {
            return await kv.get(key);
        } catch (error) {
            console.error('[Cache] Error getting from KV:', error);
            return null;
        }
    }

    // Fallback ke memory cache
    const cached = memoryCache.get(key);
    if (cached && cached.expiry > Date.now()) {
        return cached.value;
    }
    memoryCache.delete(key);
    return null;
}

async function set(key, value, expirySeconds = 300) {
    if (kv) {
        try {
            await kv.set(key, value, { ex: expirySeconds });
            return true;
        } catch (error) {
            console.error('[Cache] Error setting to KV:', error);
            return false;
        }
    }

    // Fallback ke memory cache
    memoryCache.set(key, {
        value,
        expiry: Date.now() + (expirySeconds * 1000)
    });
    return true;
}

async function del(key) {
    if (kv) {
        try {
            await kv.del(key);
            return true;
        } catch (error) {
            console.error('[Cache] Error deleting from KV:', error);
            return false;
        }
    }

    memoryCache.delete(key);
    return true;
}

async function has(key) {
    if (kv) {
        try {
            const value = await kv.get(key);
            return value !== null;
        } catch (error) {
            return false;
        }
    }

    const cached = memoryCache.get(key);
    if (cached && cached.expiry > Date.now()) {
        return true;
    }
    memoryCache.delete(key);
    return false;
}

// Cache wrapper untuk function
async function cached(key, fn, expirySeconds = 300) {
    // Cek cache dulu
    const cachedValue = await get(key);
    if (cachedValue !== null) {
        console.log(`[Cache] HIT: ${key}`);
        return cachedValue;
    }

    // Cache miss, execute function
    console.log(`[Cache] MISS: ${key}`);
    const value = await fn();

    // Simpan ke cache
    if (value !== null && value !== undefined) {
        await set(key, value, expirySeconds);
    }

    return value;
}

module.exports = {
    get,
    set,
    del,
    has,
    cached,
    isKvAvailable: () => kv !== null
};
