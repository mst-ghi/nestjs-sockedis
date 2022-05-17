import { INestApplicationContext, WebSocketAdapter } from '@nestjs/common';
import { Socket, ServerOptions, Server } from 'socket.io';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { RedisPropagatorService } from '../redis-propagator/redis-propagator.service';
import { SocketStateService } from './socket-state.service';

interface TokenPayload {
  userId?: string;
  user?: any;
}

export interface AuthenticatedSocket extends Socket {
  id: string;
  auth: TokenPayload;
}

export class SocketStateAdapter extends IoAdapter implements WebSocketAdapter {
  public constructor(
    private readonly app: INestApplicationContext,
    private readonly socketStateService: SocketStateService,
    private readonly redisPropagatorService: RedisPropagatorService,
    private readonly jwtService,
  ) {
    super(app);
  }

  public create(port: number, options: ServerOptions): Server {
    const server = super.createIOServer(port, options);
    this.redisPropagatorService.injectSocketServer(server);

    server.use(async (socket: AuthenticatedSocket, next) => {
      const token =
        socket.handshake.query.token || socket.handshake.headers.authorization;

      if (!token) {
        socket.auth = null;

        // not authenticated connection is still valid
        // thus no error
        return next();
      }

      let payload = undefined;

      try {
        payload = await this.jwtService.decodeAndValidateJWT(token);
        if (!payload) return next(new Error('authorization invalid'));

        let user = await this.jwtService.findUserById(payload.id);

        socket.auth = {
          userId: payload.id,
          user,
        };

        return next();
      } catch (e) {
        return next(e);
      }
    });

    return server;
  }

  public bindClientConnect(server: Server, callback: Function): void {
    server.on('connection', (socket: any) => {
      if (socket.auth) {
        this.socketStateService.add(socket.auth.userId, socket);

        socket.on('disconnect', () => {
          this.socketStateService.remove(socket.auth.userId, socket);

          socket.removeAllListeners('disconnect');
        });
      }

      callback(socket);
    });
  }
}
