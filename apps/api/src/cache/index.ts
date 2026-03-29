export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

let _cache: CacheService | null = null;

export function getCache(): CacheService {
  if (_cache) return _cache;

  if (process.env.REDIS_URL) {
    const { RedisCache } = require('./redisCache');
    _cache = new RedisCache(process.env.REDIS_URL);
  } else {
    const { InMemoryCache } = require('./inMemoryCache');
    _cache = new InMemoryCache();
  }

  return _cache!;
}
