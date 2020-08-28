import { Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';

import { sign, SignOptions, verify } from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import * as moment from 'moment';
import uuid = require('uuid');

import { JwtPayload } from './jwt-payload';

@Injectable()
export class BaseJwtService {
  private _model: any;
  private readonly jwtOptions: SignOptions;
  private readonly jwtKey: string;
  private refreshTokenTtl: number;
  private readonly expiresInDefault: string | number;
  public sub: any | number;

  // @todo: should be put in redis cache
  private readonly usersExpired: number[] = [];

  constructor(
    @InjectRepository(UserRepository)
    private readonly userRepository: UserRepository,
    @InjectRepository(RefreshTokenRepository)
    private readonly refreshToken: RefreshTokenRepository,
    private readonly configService: ConfigService,
  ) {
    this._model = refreshToken;
    this.expiresInDefault = this.configService.get<string>(
      'jwt.accessTokenTtl',
    );
    this.jwtOptions = { expiresIn: this.expiresInDefault };
    this.jwtKey = this.configService.get<string>('jwt.token');
    this.refreshTokenTtl = this.configService.get<number>(
      'jwt.refreshTokenTtl',
    );
  }

  /**
   * find user by id
   *
   * @param id
   */
  async findUserById(id, relations = []) {
    return await this.userRepository.findOne({ where: { id }, relations });
  }

  /**
   *
   * @param refreshToken
   * @param oldAccessToken
   * @param client_id
   * @param ip_address
   */
  async getAccessTokenFromRefreshToken(
    refreshToken: string,
    oldAccessToken: string,
    client_id: string,
    ip_address: string,
  ) {
    try {
      const token = await this._model.findOne({ value: refreshToken });
      const currentDate = new Date();
      if (!token || token.expires_at < currentDate) {
        throw new InvalidRefreshException();
      }
      const oldPayload = await this.validateToken(oldAccessToken, true);
      const payload = { sub: oldPayload.sub };
      this.sub = oldPayload.sub;
      const tokens = await this.createAccessToken(payload);
      await this.deleteRefreshToken(this.sub);
      tokens.refresh_token = await this.createRefreshToken({
        user_id: this.sub,
        client_id,
        ip_address,
      });
      return tokens;
    } catch (error) {
      throw error;
    }
  }

  /**
   * create both tokens by this method
   *
   * @param ip_address
   * @param user_id
   * @param type_id
   */
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

  /**
   * create access token by this method
   *
   * @param payload
   * @param expires
   */
  async createAccessToken(
    payload: JwtPayload,
    expires = this.expiresInDefault,
  ) {
    // If expires is negative it means that token should not expire
    const options = this.jwtOptions;
    expires > 0 ? (options.expiresIn = expires) : delete options.expiresIn;
    // Generate unique id for this token
    options.jwtid = uuid();
    const signedPayload = sign(payload, this.jwtKey, options);
    return {
      access_token: signedPayload,
      refresh_token: '',
    };
  }

  /**
   * create refresh token by this method
   *
   * @param tokenContent
   */
  async createRefreshToken(tokenContent: {
    user_id: string;
    client_id: string;
    ip_address: string;
  }): Promise<string> {
    const { user_id, client_id, ip_address } = tokenContent;
    await this.deleteRefreshTokenByClientId(user_id, client_id);
    const refreshToken = randomBytes(64).toString('hex');
    const token = new RefreshToken();
    token.user_id = user_id;
    token.value = refreshToken;
    token.client_id = client_id;
    token.ip_address = ip_address;
    token.expires_at = moment()
      .add(this.refreshTokenTtl, 'd')
      .toDate();
    await token.save();
    return refreshToken;
  }

  /**
   * Remove all the refresh tokens associated to a user
   * @param user_id id of the user
   */
  async deleteRefreshTokenForUser(user_id: string): Promise<void> {
    await this._model.delete({ user_id });
    await this.revokeTokenForUser(user_id);
  }

  /**
   *
   * @param user_id
   * @param client_id
   */
  async deleteRefreshTokenByClientId(
    user_id: string,
    client_id: string,
  ): Promise<void> {
    await this._model.delete({ client_id });
    await this.revokeTokenForUser(user_id);
  }

  /**
   * Removes a refresh token, and invalidated all access tokens for the user
   * @param user_id id of the user
   */
  async deleteRefreshToken(user_id) {
    await this._model.delete({ user_id });
    await this.revokeTokenForUser(user_id);
  }

  /**
   * Decode and Validate token
   *
   * @param token
   */
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

  /**
   * Validate Payload
   *
   * @param payload
   */
  async validatePayload(payload: JwtPayload): Promise<any> {
    const tokenBlacklisted = await this.isBlackListed(payload.sub, payload.exp);
    if (!tokenBlacklisted) {
      return {
        id: payload.sub,
      };
    }
    return null;
  }

  /**
   * Validate Token
   * @param token
   * @param ignoreExpiration
   */
  private async validateToken(
    token: string,
    ignoreExpiration: boolean = false,
  ): Promise<JwtPayload> {
    return verify(token, this.configService.get<string>('jwt.token'), {
      ignoreExpiration,
    }) as JwtPayload;
  }

  /**
   * check Is black listed token
   *
   * @param id
   * @param expire
   */
  private async isBlackListed(id: string, expire: number): Promise<boolean> {
    return this.usersExpired[id] && expire < this.usersExpired[id];
  }

  /**
   * revoke token for user
   *
   * @param user_id
   */
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
