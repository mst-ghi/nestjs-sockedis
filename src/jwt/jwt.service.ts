import { Injectable, Logger } from '@nestjs/common';
import { BaseJwtService } from './base-jwt.service';

@Injectable()
export class JwtService extends BaseJwtService {
  async findUserById(id: any) {
    //
  }
}
