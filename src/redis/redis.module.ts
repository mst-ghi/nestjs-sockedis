import { DynamicModule, Module } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

import {
  REDIS_PUBLISHER_CLIENT,
  REDIS_SUBSCRIBER_CLIENT,
  REDIS_IO,
} from './redis.constants';

import { RedisService } from './redis.service';
import { RedisDefaultConfig } from './redis.config';

@Module({})
export class RedisModule {
  static register(options?: RedisOptions): DynamicModule {
    const redisOptions = options || RedisDefaultConfig;
    return {
      module: RedisModule,
      providers: [
        {
          useFactory: () => {
            return new Redis(redisOptions);
          },
          provide: REDIS_SUBSCRIBER_CLIENT,
        },
        {
          useFactory: () => {
            return new Redis(redisOptions);
          },
          provide: REDIS_PUBLISHER_CLIENT,
        },
        {
          useFactory: () => {
            return new Redis(redisOptions);
          },
          provide: REDIS_IO,
        },
        ,
        RedisService,
      ],
      exports: [
        RedisService,
        REDIS_SUBSCRIBER_CLIENT,
        REDIS_PUBLISHER_CLIENT,
        REDIS_IO,
      ],
    };
  }
}
