import { Provider } from '@nestjs/common';
const Redis = require('ioredis');

import {
  REDIS_PUBLISHER_CLIENT,
  REDIS_SUBSCRIBER_CLIENT,
  REDIS_IO,
} from './redis.constants';

export const RedisProviders: Provider[] = [
  {
    useFactory: () => {
      return new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        username: process.env.REDIS_USERNAME || 'default',
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DATABASE || 0,
      });
    },
    provide: REDIS_SUBSCRIBER_CLIENT,
  },
  {
    useFactory: () => {
      return new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        username: process.env.REDIS_USERNAME || 'default',
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DATABASE || 0,
      });
    },
    provide: REDIS_PUBLISHER_CLIENT,
  },
  {
    useFactory: () => {
      return new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        username: process.env.REDIS_USERNAME || 'default',
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DATABASE || 0,
      });
    },
    provide: REDIS_IO,
  },
];
