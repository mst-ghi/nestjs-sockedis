import { DynamicModule, Global, Module } from '@nestjs/common';
import { RedisOptions } from 'ioredis';

import { RedisPropagatorModule } from '../redis-propagator/redis-propagator.module';
import { RedisModule } from '../redis/redis.module';
import { SocketStateModule } from '../socket-state/socket-state.module';

@Global()
@Module({
  imports: [RedisModule, RedisPropagatorModule, SocketStateModule],
  exports: [RedisModule, RedisPropagatorModule, SocketStateModule],
})
export class WebsocketModule {
  static register(redisOptions?: RedisOptions): DynamicModule {
    return {
      module: WebsocketModule,
      imports: [
        RedisModule.register(redisOptions),
        RedisPropagatorModule,
        SocketStateModule,
      ],
      exports: [RedisModule, RedisPropagatorModule, SocketStateModule],
    };
  }
}
