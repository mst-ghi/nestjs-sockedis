import { UseInterceptors, Logger } from '@nestjs/common';
import { RedisPropagatorInterceptor } from '../redis-propagator/redis-propagator.interceptor';
import { Server } from 'socket.io';

@UseInterceptors(RedisPropagatorInterceptor)
export abstract class BaseGateway {
  protected server: Server;
  protected logger: Logger;
}
