import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  sub: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

@Injectable()
export class JwtWsGuard implements CanActivate {
  private client: any;
  private logger: Logger = new Logger('JwtWsGuard');

  async canActivate(context: ExecutionContext) {
    this.client = context.switchToWs().getClient();

    let jwtToken = this.client.handshake.headers.authorization;

    if (jwtToken == undefined) {
      let msg = `ClientId:[ ${
        this.client.id
      } ], Error:[ socket authorization not found ! ]`;
      this.logger.error(msg);
      throw new WsException(msg);
    }

    let jwtPayload: JwtPayload;

    try {
      jwtPayload = <JwtPayload>jwt.verify(jwtToken, process.env.JWT_TOKEN);
    } catch (error) {
      this.logger.error(
        `ClientId:[ ${this.client.id} ], Error:[ ${error.message} ]`,
      );
    }

    return Boolean(jwtPayload.sub);
  }
}
