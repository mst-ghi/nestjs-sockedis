import { Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

import { sign, SignOptions, verify } from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import * as moment from 'moment';
import uuid = require('uuid');

import { JwtPayload } from './jwt-payload';
import { JwtServiceInterface } from './jwt-service.interface';

@Injectable()
export abstract class BaseJwtService implements JwtServiceInterface {
  private readonly jwtOptions: SignOptions;
  private readonly jwtKey: string;
  private refreshTokenTtl: number;
  private readonly expiresInDefault: string | number;
  public sub: any | number;
  private readonly usersExpired: number[] = [];

  constructor() {
    this.expiresInDefault = process.env.JWT_ACCESS_TOKEN_TTL;
    this.jwtOptions = { expiresIn: this.expiresInDefault };
    this.jwtKey = process.env.JWT_TOKEN;
    this.refreshTokenTtl =
      parseInt(process.env.JWT_REFRESH_TOKEN_TTL, 10) || 15;
  }

  async findUserById(id: any) {
    //
  }

  async createTokens(ip_address: string, user_id: string, type_id: string) {
    const payload: JwtPayload = { sub: user_id };
    const tokens = await this.createAccessToken(payload);
    await this.deleteRefreshTokenForUser(user_id);
    tokens.refresh_token = await this.createRefreshToken({
      user_id: user_id,
      client_id: type_id,
      ip_address,
    });
    return tokens;
  }

  async createAccessToken(
    payload: JwtPayload,
    expires = this.expiresInDefault,
  ) {
    const options = this.jwtOptions;
    expires > 0 ? (options.expiresIn = expires) : delete options.expiresIn;
    options.jwtid = uuid();
    const signedPayload = sign(payload, this.jwtKey, options);
    return {
      access_token: signedPayload,
      refresh_token: '',
    };
  }

  async createRefreshToken(tokenContent: {
    user_id: string;
    client_id: string;
    ip_address: string;
  }): Promise<string> {
    const { user_id, ip_address } = tokenContent;
    await this.deleteRefreshTokenByClientId(user_id);
    return randomBytes(64).toString('hex');
  }

  async deleteRefreshTokenForUser(user_id: string): Promise<void> {
    await this.revokeTokenForUser(user_id);
  }

  async deleteRefreshTokenByClientId(user_id: string): Promise<void> {
    await this.revokeTokenForUser(user_id);
  }

  async deleteRefreshToken(user_id) {
    await this.revokeTokenForUser(user_id);
  }

  async decodeAndValidateJWT(token: string): Promise<any> {
    if (token) {
      try {
        const payload = await this.validateToken(token);
        return await this.validatePayload(payload);
      } catch (error) {
        return null;
      }
    }
  }

  async validatePayload(payload: JwtPayload): Promise<any> {
    const tokenBlacklisted = await this.isBlackListed(payload.sub, payload.exp);
    if (!tokenBlacklisted) {
      return {
        id: payload.sub,
      };
    }
    return null;
  }

  private async validateToken(
    token: string,
    ignoreExpiration: boolean = false,
  ): Promise<JwtPayload> {
    return verify(token, this.jwtKey, {
      ignoreExpiration,
    }) as JwtPayload;
  }

  private async isBlackListed(id: string, expire: number): Promise<boolean> {
    return this.usersExpired[id] && expire < this.usersExpired[id];
  }

  private async revokeTokenForUser(user_id: string): Promise<any> {
    this.usersExpired[user_id] = moment()
      .add(this.expiresInDefault, 's')
      .unix();
  }

  async handleSocketConnection(authorization: string) {
    if (!authorization)
      throw new WsException('socket authorization not found!');
    let payload = await this.decodeAndValidateJWT(authorization);
    if (payload == null) throw new WsException('socket authorization invalid!');
    return payload;
  }
}
