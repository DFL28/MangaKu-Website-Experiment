// ===== Rate Limiter =====
// Prevents too many requests to manga sources

class RateLimiter {
    constructor(maxRequests = 10, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map();
    }

    async limit(key) {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        // Get or create request history for this key
        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }

        const requestHistory = this.requests.get(key);

        // Remove old requests outside the window
        const recentRequests = requestHistory.filter(time => time > windowStart);
        this.requests.set(key, recentRequests);

        // Check if limit exceeded
        if (recentRequests.length >= this.maxRequests) {
            const oldestRequest = recentRequests[0];
            const waitTime = oldestRequest + this.windowMs - now;

            // Wait until we can make another request
            await this.sleep(waitTime);
        }

        // Add current request
        recentRequests.push(now);
        this.requests.set(key, recentRequests);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    reset(key) {
        this.requests.delete(key);
    }

    resetAll() {
        this.requests.clear();
    }

    // Get stats for a key
    getStats(key) {
        if (!this.requests.has(key)) {
            return {
                requests: 0,
                remaining: this.maxRequests
            };
        }

        const now = Date.now();
        const windowStart = now - this.windowMs;
        const recentRequests = this.requests.get(key).filter(time => time > windowStart);

        return {
            requests: recentRequests.length,
            remaining: Math.max(0, this.maxRequests - recentRequests.length)
        };
    }
}

// Create rate limiters for different sources
const mangadexLimiter = new RateLimiter(5, 1000); // 5 requests per second (MangaDex API limit)
const komikuLimiter = new RateLimiter(10, 60000); // 10 requests per minute
const maidLimiter = new RateLimiter(10, 60000); // 10 requests per menit
const bacamangaLimiter = new RateLimiter(10, 60000); // 10 requests per minute

// Global limiter for all sources combined
const globalLimiter = new RateLimiter(30, 60000); // 30 requests per minute total

module.exports = {
    RateLimiter,
    mangadexLimiter,
    komikuLimiter,
    maidLimiter,
    bacamangaLimiter,
    globalLimiter
};
