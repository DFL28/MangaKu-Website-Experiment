// ===== Proxy Manager untuk Scraping =====
// Mendukung multiple proxy dan auto rotation

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

class ProxyManager {
    constructor() {
        // List proxy - ganti dengan proxy Anda sendiri
        // Format: protocol://username:password@host:port
        // Atau: protocol://host:port (jika tidak pakai auth)
        this.proxies = [
            // Contoh dengan auth:
            // 'http://username:password@proxy1.com:8080',
            // 'http://username:password@proxy2.com:8080',

            // Contoh tanpa auth:
            // 'http://proxy1.com:8080',
            // 'http://proxy2.com:8080',

            // Free proxy (tidak stabil, hanya untuk testing):
            // 'http://103.152.112.162:80',
            // 'http://103.167.135.110:80',
            
            // Add some working public proxies (these are examples, you should use your own)
            // 'http://proxy1.com:8080',
            // 'http://proxy2.com:8080'
        ];

        this.currentIndex = 0;
        this.failedProxies = new Set();
        this.proxyStats = new Map();

        // Load dari environment variable jika ada
        this.loadFromEnv();

        // Initialize stats
        this.proxies.forEach(proxy => {
            this.proxyStats.set(proxy, {
                success: 0,
                failed: 0,
                lastUsed: null,
                avgResponseTime: 0
            });
        });
        
        // If no proxies are configured, use direct connections
        if (this.proxies.length === 0) {
            console.log('⚠️ No proxies configured, using direct connections');
        }
    }

    loadFromEnv() {
        // Load dari environment variable: PROXIES="proxy1,proxy2,proxy3"
        const envProxies = process.env.PROXIES;
        if (envProxies) {
            const proxyList = envProxies.split(',').map(p => p.trim()).filter(Boolean);
            if (proxyList.length > 0) {
                this.proxies = proxyList;
                console.log(`✅ Loaded ${proxyList.length} proxies from environment`);
            }
        }
    }

    // Get proxy berikutnya (round-robin)
    getNextProxy() {
        if (this.proxies.length === 0) {
            return null;
        }

        // Skip proxy yang gagal
        let attempts = 0;
        while (attempts < this.proxies.length) {
            const proxy = this.proxies[this.currentIndex];
            this.currentIndex = (this.currentIndex + 1) % this.proxies.length;

            if (!this.failedProxies.has(proxy)) {
                return proxy;
            }

            attempts++;
        }

        // Jika semua proxy gagal, reset dan coba lagi
        console.warn('⚠️ All proxies failed, resetting...');
        this.failedProxies.clear();
        return this.proxies[0];
    }

    // Get random proxy
    getRandomProxy() {
        if (this.proxies.length === 0) {
            return null;
        }

        const availableProxies = this.proxies.filter(p => !this.failedProxies.has(p));
        if (availableProxies.length === 0) {
            this.failedProxies.clear();
            return this.proxies[Math.floor(Math.random() * this.proxies.length)];
        }

        return availableProxies[Math.floor(Math.random() * availableProxies.length)];
    }

    // Get least used proxy
    getLeastUsedProxy() {
        if (this.proxies.length === 0) {
            return null;
        }

        let leastUsed = null;
        let minUsage = Infinity;

        for (const proxy of this.proxies) {
            if (this.failedProxies.has(proxy)) continue;

            const stats = this.proxyStats.get(proxy);
            const totalUsage = stats.success + stats.failed;

            if (totalUsage < minUsage) {
                minUsage = totalUsage;
                leastUsed = proxy;
            }
        }

        return leastUsed || this.getNextProxy();
    }

    // Mark proxy sebagai berhasil
    markSuccess(proxy, responseTime = 0) {
        const stats = this.proxyStats.get(proxy);
        if (stats) {
            stats.success++;
            stats.lastUsed = Date.now();

            // Update average response time
            if (stats.avgResponseTime === 0) {
                stats.avgResponseTime = responseTime;
            } else {
                stats.avgResponseTime = (stats.avgResponseTime + responseTime) / 2;
            }
        }

        // Remove from failed list if exists
        this.failedProxies.delete(proxy);
    }

    // Mark proxy sebagai gagal
    markFailed(proxy) {
        const stats = this.proxyStats.get(proxy);
        if (stats) {
            stats.failed++;
            stats.lastUsed = Date.now();
        }

        // Add to failed list if too many failures
        if (stats && stats.failed > 5) {
            this.failedProxies.add(proxy);
            console.warn(`⚠️ Proxy ${proxy} marked as failed (${stats.failed} failures)`);
        }
    }

    // Create axios config dengan proxy
    getAxiosConfig(proxy = null) {
        const selectedProxy = proxy || this.getNextProxy();

        if (!selectedProxy) {
            return {
                timeout: 30000,
                headers: {
                    'User-Agent': this.getRandomUserAgent()
                }
            };
        }

        const agent = new HttpsProxyAgent(selectedProxy);

        return {
            httpAgent: agent,
            httpsAgent: agent,
            timeout: 30000,
            headers: {
                'User-Agent': this.getRandomUserAgent()
            },
            proxy: false // Disable axios built-in proxy (kita pakai agent)
        };
    }

    // Get random user agent
    getRandomUserAgent() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0'
        ];

        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    // Fetch dengan auto proxy rotation
    async fetchWithProxy(url, options = {}) {
        // If no proxies are configured, use direct connection
        if (this.proxies.length === 0) {
            try {
                console.log(`🔄 Direct fetch (no proxies configured): ${url}`);
                const startTime = Date.now();
                
                const config = {
                    timeout: 15000, // Increased timeout
                    headers: {
                        'User-Agent': this.getRandomUserAgent()
                    },
                    ...options
                };

                const response = await axios.get(url, config);
                const responseTime = Date.now() - startTime;
                console.log(`✅ Direct fetch success in ${responseTime}ms`);
                return response;
            } catch (error) {
                console.error(`❌ Direct fetch failed:`, error.message);
                throw error;
            }
        }

        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const proxy = this.getNextProxy();
            const startTime = Date.now();

            try {
                const config = {
                    ...this.getAxiosConfig(proxy),
                    ...options
                };

                console.log(`🔄 [Attempt ${attempt + 1}/${maxRetries}] Fetching ${url}${proxy ? ' via proxy' : ' (direct)'}`);

                const response = await axios.get(url, config);
                const responseTime = Date.now() - startTime;

                if (proxy) {
                    this.markSuccess(proxy, responseTime);
                }

                console.log(`✅ Success in ${responseTime}ms`);
                return response;

            } catch (error) {
                lastError = error;
                const responseTime = Date.now() - startTime;

                if (proxy) {
                    this.markFailed(proxy);
                }

                console.error(`❌ [Attempt ${attempt + 1}/${maxRetries}] Failed in ${responseTime}ms:`, error.message);

                // Wait sebentar sebelum retry
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1))); // Reduced delay
                }
            }
        }

        throw lastError;
    }

    // Get statistik proxy
    getStats() {
        const stats = [];

        for (const [proxy, data] of this.proxyStats.entries()) {
            const successRate = data.success + data.failed > 0
                ? ((data.success / (data.success + data.failed)) * 100).toFixed(2)
                : 0;

            stats.push({
                proxy: this.maskProxy(proxy),
                success: data.success,
                failed: data.failed,
                successRate: `${successRate}%`,
                avgResponseTime: `${data.avgResponseTime.toFixed(0)}ms`,
                lastUsed: data.lastUsed ? new Date(data.lastUsed).toISOString() : 'Never',
                isFailed: this.failedProxies.has(proxy)
            });
        }

        return {
            total: this.proxies.length,
            active: this.proxies.length - this.failedProxies.size,
            failed: this.failedProxies.size,
            proxies: stats
        };
    }

    // Mask proxy untuk keamanan (hide password)
    maskProxy(proxyUrl) {
        try {
            const url = new URL(proxyUrl);
            if (url.username || url.password) {
                return `${url.protocol}//${url.username}:****@${url.host}`;
            }
            return proxyUrl;
        } catch {
            return proxyUrl.replace(/:[^:@]+@/, ':****@');
        }
    }

    // Reset failed proxies
    resetFailedProxies() {
        this.failedProxies.clear();
        console.log('✅ All failed proxies have been reset');
    }

    // Add proxy dinamis
    addProxy(proxyUrl) {
        if (!this.proxies.includes(proxyUrl)) {
            this.proxies.push(proxyUrl);
            this.proxyStats.set(proxyUrl, {
                success: 0,
                failed: 0,
                lastUsed: null,
                avgResponseTime: 0
            });
            console.log(`✅ Proxy added: ${this.maskProxy(proxyUrl)}`);
            return true;
        }
        return false;
    }

    // Remove proxy
    removeProxy(proxyUrl) {
        const index = this.proxies.indexOf(proxyUrl);
        if (index !== -1) {
            this.proxies.splice(index, 1);
            this.proxyStats.delete(proxyUrl);
            this.failedProxies.delete(proxyUrl);
            console.log(`✅ Proxy removed: ${this.maskProxy(proxyUrl)}`);
            return true;
        }
        return false;
    }
}

// Singleton instance
const proxyManager = new ProxyManager();

module.exports = {
    ProxyManager,
    proxyManager
};
