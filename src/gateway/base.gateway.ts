import { UseInterceptors, Logger } from '@nestjs/common';
import {
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { RedisPropagatorInterceptor } from '../redis-propagator/redis-propagator.interceptor';
import { Server } from 'socket.io';

@UseInterceptors(RedisPropagatorInterceptor)
export abstract class BaseGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  protected server: Server;
  protected logger: Logger;

  async afterInit(server: any) {
    this.server = server;
    this.logger = new Logger(`WebSocket:${this.constructor.name}`);
  }

  async handleConnection(client: any, ...args: any[]) {
    this.logger.verbose(
      `[${client.id}] [${
        client.auth.user ? client.auth.user.mobile : client.auth.userId
      }] connected to ${this.constructor.name}`,
    );
  }

  async handleDisconnect(client: any) {
    this.logger.verbose(
      `[${client.id}] [${
        client.auth.user ? client.auth.user.mobile : client.auth.userId
      }] disconnected from ${this.constructor.name}`,
    );
  }
}
