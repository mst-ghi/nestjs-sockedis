import { RedisOptions } from 'ioredis';

export const RedisDefaultConfig: RedisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: +process.env.REDIS_PORT || 6379,
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD,
  db: +process.env.REDIS_DATABASE || 0,
};
