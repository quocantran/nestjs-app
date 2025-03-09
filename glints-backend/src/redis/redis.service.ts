import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class RedisService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async clearCache(key: string) {
    const keys = await this.cacheManager.store.keys(`${key}*`);

    await Promise.all(
      keys.map(async (k: string) => {
        await this.cacheManager.store.del(k);
      }),
    );
  }

  async checkKey(key: string) {
    return await this.cacheManager.store.keys(`${key}*`);
  }

  async getValue(key: string) {
    return await this.cacheManager.store.get(key);
  }

  async setValue(key: string, value: any, ttl: number) {
    return await this.cacheManager.store.set(key, value, { ttl });
  }
}
