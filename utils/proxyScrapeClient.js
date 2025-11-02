// ===== ProxyScrape API Client =====
// Fetch proxies otomatis dari ProxyScrape.com

const axios = require('axios');
const { proxyManager } = require('./proxyManager');

class ProxyScrapeClient {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.PROXYSCRAPE_API_KEY;
        this.baseUrl = 'https://api.proxyscrape.com/v2';
        this.lastFetch = null;
        this.fetchInterval = 3600000; // 1 jam
    }

    /**
     * Fetch proxy list dari ProxyScrape
     * @param {Object} options - Filter options
     * @returns {Promise<Array>} Array of proxy URLs
     */
    async fetchProxies(options = {}) {
        try {
            const params = {
                request: 'displayproxies',
                api_key: this.apiKey,

                // Default options
                protocol: options.protocol || 'http', // http, socks4, socks5, all
                timeout: options.timeout || 10000,     // 1000-10000ms
                country: options.country || 'all',     // all, US, GB, etc
                ssl: options.ssl || 'all',             // yes, no, all
                anonymity: options.anonymity || 'all', // elite, anonymous, transparent, all

                // Format
                format: 'textplain'
            };

            console.log('📡 Fetching proxies from ProxyScrape...');

            const response = await axios.get(this.baseUrl, {
                params,
                timeout: 30000
            });

            if (!response.data) {
                throw new Error('No data received from ProxyScrape');
            }

            // Parse response (format: ip:port per line)
            const proxies = response.data
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && line.includes(':'))
                .map(line => {
                    const protocol = params.protocol === 'all' ? 'http' : params.protocol;
                    return `${protocol}://${line}`;
                });

            console.log(`✅ Fetched ${proxies.length} proxies from ProxyScrape`);
            this.lastFetch = Date.now();

            return proxies;

        } catch (error) {
            console.error('❌ Error fetching proxies from ProxyScrape:', error.message);
            return [];
        }
    }

    /**
     * Fetch dan update proxy manager
     */
    async updateProxyManager(options = {}) {
        try {
            const proxies = await this.fetchProxies(options);

            if (proxies.length === 0) {
                console.warn('⚠️  No proxies fetched, keeping existing ones');
                return false;
            }

            // Add proxies ke proxy manager
            let added = 0;
            for (const proxy of proxies) {
                if (proxyManager.addProxy(proxy)) {
                    added++;
                }
            }

            console.log(`✅ Added ${added} new proxies to proxy manager`);
            return true;

        } catch (error) {
            console.error('❌ Error updating proxy manager:', error.message);
            return false;
        }
    }

    /**
     * Auto-fetch proxies dengan interval
     */
    startAutoFetch(options = {}, interval = null) {
        const fetchInterval = interval || this.fetchInterval;

        console.log(`🔄 Starting auto-fetch proxies every ${fetchInterval / 60000} minutes`);

        // Fetch immediately
        this.updateProxyManager(options);

        // Setup interval
        this.autoFetchTimer = setInterval(() => {
            console.log('🔄 Auto-fetching proxies...');
            this.updateProxyManager(options);
        }, fetchInterval);

        return this.autoFetchTimer;
    }

    /**
     * Stop auto-fetch
     */
    stopAutoFetch() {
        if (this.autoFetchTimer) {
            clearInterval(this.autoFetchTimer);
            this.autoFetchTimer = null;
            console.log('⏹️  Stopped auto-fetch proxies');
        }
    }

    /**
     * Get account info (jika pakai premium)
     */
    async getAccountInfo() {
        try {
            const response = await axios.get(`${this.baseUrl}/account`, {
                params: {
                    api_key: this.apiKey
                }
            });

            return response.data;
        } catch (error) {
            console.error('❌ Error getting account info:', error.message);
            return null;
        }
    }

    /**
     * Preset configurations untuk berbagai use case
     */
    static getPresets() {
        return {
            // Fast proxies untuk scraping ringan
            fast: {
                protocol: 'http',
                timeout: 5000,
                anonymity: 'elite'
            },

            // Stable proxies untuk scraping berat
            stable: {
                protocol: 'http',
                timeout: 10000,
                anonymity: 'all'
            },

            // SOCKS5 untuk bypass blocks
            socks: {
                protocol: 'socks5',
                timeout: 10000,
                anonymity: 'elite'
            },

            // SSL/HTTPS proxies
            ssl: {
                protocol: 'http',
                timeout: 10000,
                ssl: 'yes',
                anonymity: 'elite'
            },

            // US proxies only
            us: {
                protocol: 'http',
                timeout: 10000,
                country: 'US',
                anonymity: 'elite'
            },

            // Mixed (semua jenis)
            mixed: {
                protocol: 'all',
                timeout: 10000,
                anonymity: 'all'
            }
        };
    }
}

// Create singleton instance
let proxyScrapeClient = null;

function initProxyScrape(apiKey = null) {
    if (!proxyScrapeClient) {
        const key = apiKey || process.env.PROXYSCRAPE_API_KEY;

        if (!key) {
            console.warn('⚠️  ProxyScrape API key not provided, proxy auto-fetch disabled');
            return null;
        }

        proxyScrapeClient = new ProxyScrapeClient(key);
        console.log('✅ ProxyScrape client initialized');
    }

    return proxyScrapeClient;
}

module.exports = {
    ProxyScrapeClient,
    initProxyScrape,
    getProxyScrapeClient: () => proxyScrapeClient
};
