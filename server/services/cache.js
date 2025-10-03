const NodeCache = require('node-cache');

/**
 * Cache Service
 * Provides in-memory caching for frequently accessed data
 */
class CacheService {
  constructor() {
    // Organization metadata cache - 15 minute TTL
    this.orgCache = new NodeCache({
      stdTTL: 900, // 15 minutes
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false, // Return references for better performance
      deleteOnExpire: true,
      maxKeys: 1000 // Limit to 1000 organizations
    });

    // User permissions cache - 5 minute TTL
    this.userCache = new NodeCache({
      stdTTL: 300, // 5 minutes
      checkperiod: 60,
      useClones: false,
      deleteOnExpire: true,
      maxKeys: 10000 // Support up to 10k concurrent users
    });

    // Metrics cache - 1 minute TTL (for real-time-ish data)
    this.metricsCache = new NodeCache({
      stdTTL: 60, // 1 minute
      checkperiod: 30,
      useClones: false,
      deleteOnExpire: true,
      maxKeys: 500
    });

    this._setupEventHandlers();
  }

  /**
   * Setup cache event handlers for monitoring
   */
  _setupEventHandlers() {
    // Organization cache events
    this.orgCache.on('set', (key, value) => {
      console.log(`[Cache] Organization cached: ${key}`);
    });

    this.orgCache.on('expired', (key, value) => {
      console.log(`[Cache] Organization cache expired: ${key}`);
    });

    this.orgCache.on('del', (key, value) => {
      console.log(`[Cache] Organization cache deleted: ${key}`);
    });

    // User cache events
    this.userCache.on('expired', (key, value) => {
      console.log(`[Cache] User cache expired: ${key}`);
    });

    // Metrics cache events (don't log these - too noisy)
    this.metricsCache.on('expired', () => {
      // Silent expiration for metrics
    });
  }

  // ============================================================================
  // Organization Cache Methods
  // ============================================================================

  /**
   * Get organization by ID from cache
   */
  getOrganization(orgId) {
    return this.orgCache.get(`org:${orgId}`);
  }

  /**
   * Get organization by slug from cache
   */
  getOrganizationBySlug(slug) {
    return this.orgCache.get(`org:slug:${slug}`);
  }

  /**
   * Set organization in cache (indexed by both ID and slug)
   */
  setOrganization(org) {
    if (!org || !org.id) return false;

    this.orgCache.set(`org:${org.id}`, org);
    
    if (org.slug) {
      this.orgCache.set(`org:slug:${org.slug}`, org);
    }

    return true;
  }

  /**
   * Get all organizations from cache
   */
  getAllOrganizations() {
    return this.orgCache.get('orgs:all');
  }

  /**
   * Set all organizations in cache
   */
  setAllOrganizations(orgs) {
    if (!Array.isArray(orgs)) return false;
    
    this.orgCache.set('orgs:all', orgs);
    
    // Also cache individual organizations
    orgs.forEach(org => this.setOrganization(org));
    
    return true;
  }

  /**
   * Invalidate organization cache
   */
  invalidateOrganization(orgId) {
    const org = this.getOrganization(orgId);
    
    this.orgCache.del(`org:${orgId}`);
    
    if (org && org.slug) {
      this.orgCache.del(`org:slug:${org.slug}`);
    }
    
    // Invalidate all organizations list
    this.orgCache.del('orgs:all');
    
    return true;
  }

  // ============================================================================
  // User Cache Methods
  // ============================================================================

  /**
   * Get user metadata from cache
   */
  getUser(userId) {
    return this.userCache.get(`user:${userId}`);
  }

  /**
   * Set user metadata in cache
   */
  setUser(userId, userData) {
    if (!userId) return false;
    return this.userCache.set(`user:${userId}`, userData);
  }

  /**
   * Invalidate user cache
   */
  invalidateUser(userId) {
    return this.userCache.del(`user:${userId}`);
  }

  /**
   * Get user permissions from cache
   */
  getUserPermissions(userId, orgId) {
    return this.userCache.get(`perm:${userId}:${orgId}`);
  }

  /**
   * Set user permissions in cache
   */
  setUserPermissions(userId, orgId, permissions) {
    if (!userId || !orgId) return false;
    return this.userCache.set(`perm:${userId}:${orgId}`, permissions);
  }

  // ============================================================================
  // Metrics Cache Methods
  // ============================================================================

  /**
   * Get metrics from cache
   */
  getMetrics(orgId, type, dateRange) {
    const key = `metrics:${orgId}:${type}:${dateRange}`;
    return this.metricsCache.get(key);
  }

  /**
   * Set metrics in cache
   */
  setMetrics(orgId, type, dateRange, data) {
    if (!orgId || !type) return false;
    const key = `metrics:${orgId}:${type}:${dateRange}`;
    return this.metricsCache.set(key, data);
  }

  /**
   * Invalidate all metrics for an organization
   */
  invalidateOrgMetrics(orgId) {
    const keys = this.metricsCache.keys();
    keys.forEach(key => {
      if (key.startsWith(`metrics:${orgId}:`)) {
        this.metricsCache.del(key);
      }
    });
    return true;
  }

  // ============================================================================
  // Cache Management Methods
  // ============================================================================

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      organizations: {
        keys: this.orgCache.keys().length,
        stats: this.orgCache.getStats(),
        hits: this.orgCache.getStats().hits,
        misses: this.orgCache.getStats().misses,
        hitRate: this._calculateHitRate(this.orgCache.getStats())
      },
      users: {
        keys: this.userCache.keys().length,
        stats: this.userCache.getStats(),
        hits: this.userCache.getStats().hits,
        misses: this.userCache.getStats().misses,
        hitRate: this._calculateHitRate(this.userCache.getStats())
      },
      metrics: {
        keys: this.metricsCache.keys().length,
        stats: this.metricsCache.getStats(),
        hits: this.metricsCache.getStats().hits,
        misses: this.metricsCache.getStats().misses,
        hitRate: this._calculateHitRate(this.metricsCache.getStats())
      }
    };
  }

  /**
   * Calculate cache hit rate
   */
  _calculateHitRate(stats) {
    const total = stats.hits + stats.misses;
    if (total === 0) return 0;
    return ((stats.hits / total) * 100).toFixed(2);
  }

  /**
   * Flush all caches
   */
  flushAll() {
    this.orgCache.flushAll();
    this.userCache.flushAll();
    this.metricsCache.flushAll();
    console.log('[Cache] All caches flushed');
    return true;
  }

  /**
   * Close all caches (for graceful shutdown)
   */
  close() {
    this.orgCache.close();
    this.userCache.close();
    this.metricsCache.close();
    console.log('[Cache] All caches closed');
  }
}

// Export singleton instance
const cacheService = new CacheService();

module.exports = cacheService;

