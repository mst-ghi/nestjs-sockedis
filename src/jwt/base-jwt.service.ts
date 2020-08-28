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

  /**
   * create AccessToken and Refresh Token
   *
   * @param userId
   * @param clientId [any unique value related to the user]
   *
   * @returns {accessToken: '', refreshToken: ''}
   */
  async createTokens(userId: string, clientId: string) {
    const payload: JwtPayload = { sub: userId };
    const tokens = await this.createAccessToken(payload);
    await this.deleteRefreshTokenForUser(userId);
    tokens.refreshToken = await this.createRefreshToken({ userId, clientId });
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
      accessToken: signedPayload,
      refreshToken: '',
    };
  }

  async createRefreshToken(tokenContent: {
    userId: string;
    clientId: string;
  }): Promise<string> {
    const { userId } = tokenContent;
    await this.deleteRefreshTokenByClientId(userId);
    return randomBytes(64).toString('hex');
  }

  async deleteRefreshTokenForUser(userId: string): Promise<void> {
    await this.revokeTokenForUser(userId);
  }

  async deleteRefreshTokenByClientId(userId: string): Promise<void> {
    await this.revokeTokenForUser(userId);
  }

  async deleteRefreshToken(userId) {
    await this.revokeTokenForUser(userId);
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

  private async revokeTokenForUser(userId: string): Promise<any> {
    this.usersExpired[userId] = moment()
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
