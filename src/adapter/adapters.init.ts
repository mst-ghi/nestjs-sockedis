import { INestApplication } from '@nestjs/common';
import { JwtServiceInterface } from '../jwt/jwt-service.interface';
import { JwtService } from '../jwt/jwt.service';

import { RedisPropagatorService } from '../redis-propagator/redis-propagator.service';
import { SocketStateAdapter } from '../socket-state/socket-state.adapter';
import { SocketStateService } from '../socket-state/socket-state.service';

export const InitAdapters = (
  app: INestApplication,
  jwtService: JwtServiceInterface = null,
): INestApplication => {
  const socketStateService = app.get(SocketStateService);
  const redisPropagatorService = app.get(RedisPropagatorService);

  app.useWebSocketAdapter(
    new SocketStateAdapter(
      app,
      socketStateService,
      redisPropagatorService,
      jwtService ? jwtService : new JwtService(),
    ),
  );

  return app;
};
