class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.maxRequests = options.maxRequests || 60; // 60 requests per minute
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.requests = new Map();
    
    // Cleanup old entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 300000);
    
    console.log(`Rate limiter initialized: ${this.maxRequests} requests per ${this.windowMs}ms`);
  }

  getKey(req) {
    // Use IP address as the key, but could be extended to use user session, API key, etc.
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  isAllowed(req, res) {
    const key = this.getKey(req);
    const now = Date.now();
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const userRequests = this.requests.get(key);
    
    // Remove expired requests
    const validRequests = userRequests.filter(timestamp => 
      now - timestamp < this.windowMs
    );
    
    // Check if user has exceeded the limit
    if (validRequests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...validRequests);
      const resetTime = oldestRequest + this.windowMs;
      
      console.warn(`Rate limit exceeded for ${key}: ${validRequests.length}/${this.maxRequests} requests`);
      
      res.set({
        'X-RateLimit-Limit': this.maxRequests,
        'X-RateLimit-Remaining': 0,
        'X-RateLimit-Reset': new Date(resetTime).toISOString()
      });
      
      return false;
    }
    
    // Add current request timestamp
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': this.maxRequests,
      'X-RateLimit-Remaining': this.maxRequests - validRequests.length,
      'X-RateLimit-Reset': new Date(now + this.windowMs).toISOString()
    });
    
    return true;
  }

  middleware() {
    return (req, res, next) => {
      if (this.isAllowed(req, res)) {
        next();
      } else {
        res.status(429).json({ error: '请求过于频繁，请稍后再试' });
      }
    };
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, requests] of this.requests) {
      const validRequests = requests.filter(timestamp => 
        now - timestamp < this.windowMs
      );
      
      if (validRequests.length === 0) {
        this.requests.delete(key);
        cleaned++;
      } else if (validRequests.length !== requests.length) {
        this.requests.set(key, validRequests);
      }
    }
    
    if (cleaned > 0) {
      console.log(`Rate limiter cleaned up ${cleaned} expired entries`);
    }
  }

  getStats() {
    const now = Date.now();
    const stats = {
      totalKeys: this.requests.size,
      activeRequests: 0,
      topUsers: []
    };
    
    const userCounts = [];
    
    for (const [key, requests] of this.requests) {
      const activeRequests = requests.filter(timestamp => 
        now - timestamp < this.windowMs
      );
      
      stats.activeRequests += activeRequests.length;
      
      if (activeRequests.length > 0) {
        userCounts.push({ key, count: activeRequests.length });
      }
    }
    
    stats.topUsers = userCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return stats;
  }
}

module.exports = RateLimiter;