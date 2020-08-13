import { Module } from '@nestjs/common';

import { RedisProviders } from './redis.providers';
import { RedisService } from './redis.service';

@Module({
  providers: [...RedisProviders, RedisService],
  exports: [...RedisProviders, RedisService],
})
export class RedisModule {}
