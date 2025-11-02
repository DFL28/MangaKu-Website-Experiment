# Caching System Documentation

## Overview

This manga website uses a dual-layer caching system to improve performance and reduce scraping load:

1. **Memory Cache** - Fast in-memory cache for frequently accessed data
2. **File Cache** - Persistent file-based cache that survives server restarts

## How It Works

### Memory Cache
- Stores data in RAM for ultra-fast access
- Automatically expires after a set time (TTL)
- Best for frequently accessed data like popular manga lists

### File Cache
- Stores data as JSON files in the `cache/` directory
- Survives server restarts
- Used as a backup when memory cache is empty
- Automatically expires after a set time (TTL)

## Cache Layers

The system checks for cached data in this order:
1. **File Cache** - Check persistent storage first
2. **Memory Cache** - Check in-memory storage
3. **Live Scraping** - Fetch fresh data if not cached

## Cache Expiration Times

| Data Type | Memory Cache TTL | File Cache TTL |
|-----------|------------------|----------------|
| Manga Lists | 10 minutes | 10 minutes |
| Manga Details | 30 minutes | 30 minutes |
| Chapter Lists | 10 minutes | 10 minutes |
| Chapter Pages | 1 hour | 1 hour |
| Search Results | 5 minutes | 5 minutes |

## API Endpoints

### View Cache Statistics
```
GET /api/cache/stats
```

### Clear All Cache
```
POST /api/cache/clear
```

## Benefits

1. **Faster Loading** - Cached data loads instantly
2. **Reduced Server Load** - Less scraping means less server strain
3. **Better User Experience** - Pages load faster for all users
4. **Persistent Caching** - File cache works even after server restarts

## How to Use

The caching system works automatically. When a user requests data:
1. System checks file cache first
2. If not found, checks memory cache
3. If not found, scrapes fresh data
4. Saves to both cache layers for future requests

## Maintenance

To clear the cache manually:
1. Use the `/api/cache/clear` endpoint
2. Or delete files in the `cache/` directory

Regular cache clearing helps ensure users get fresh data periodically.