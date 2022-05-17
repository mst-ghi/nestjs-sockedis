## Nest Sockedis

> **`Nestjs`**, **`SocketIO`**, **`Redis`**, **`JWT`**
>
> &NewLine;
> A library for much **easier** implementation of **socketIO** in the **NestJs** framework with user **authentication** using the **jwt** method
> Also implement operations with **redis** > &NewLine;

### Installation

```bash
# npm
$ npm install --save nest-sockedis

# yarn
$ yarn add nest-sockedis
```

&NewLine;

### Environment config

> Configures required to start inside the **.env** file

- REDIS_HOST=127.0.0.1
- REDIS_PORT=6379
- REDIS_USERNAME=username
- REDIS_PASSWORD=password
- REDIS_DATABASE=0
- JWT_TOKEN=strong_hash_string
- JWT_ACCESS_TOKEN_TTL=13600 // 3600 second
- JWT_REFRESH_TOKEN_TTL=15 // 15 days

&NewLine;

### Getting Started

> Init the Adapter in `main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { InitAdapters } from 'nest-sockedis';
// import { YourJwtService } from './jwt/jwt.service'; import your jwt service

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // InitAdapters(app, new YourJwtService()); inject your jwt service
  // or
  InitAdapters(app);
}

bootstrap();
```

> Import WebsocketModule in the root module of the application. `app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebsocketModule } from 'nest-sockedis';

@Module({
  imports: [WebsocketModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

&NewLine;

> Your **JwtService**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { BaseJwtService } from 'nest-sockedis';

@Injectable()
export class JwtService extends BaseJwtService {
  async findUserById(id: any) {
    // operation code here
  }
}
```

> Methods available for this JwtService :

```typescript
/**
 * create AccessToken and Refresh Token
 *
 * @param userId
 * @param clientId [any unique value related to the user]
 *
 * @returns {accessToken: '', refreshToken: ''}
 */
service.createTokens('userId', 'clientId');
```

&NewLine;

> Your **ChatsGateway**

```typescript
import {
  SubscribeMessage,
  WebSocketGateway,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { BaseGateway, JwtWsGuard } from 'nest-sockedis';

@WebSocketGateway({ path: '/chats' })
export class ChatsGateway extends BaseGateway {
  @SubscribeMessage('chats')
  @UseGuards(JwtWsGuard) /* Required for authentication */
  async onChats(
    @ConnectedSocket() client: any,
    @MessageBody() data: any /* You can use the dto class as type */,
  ) {
    /* user info */
    let user = client.auth.user;
    /* emit to chats event */
    this.server.to(client.id).emit('chats', { message: `hello ${user.id}` });
  }
}
```

&NewLine;

> Your **ChatsModule**

```typescript
import { Module } from '@nestjs/common';
import { ChatsGateway } from './chats.gateway';
import { JwtWsGuard } from 'nest-sockedis';
@Module({
  providers: [JwtWsGuard, ChatsGateway],
})
export class ChatsModule {}
```

&NewLine;

> Client handshake to connect to the gateway

```js
handshake?: {
    query?: {
      token?: string;
    };
    headers?: {
      authorization?: string;
    };
};
```

&NewLine;

> Your **RedisService**

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from 'nest-sockedis';

@Module({
  imports: [RedisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

&NewLine;

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'nest-sockedis';

@Injectable()
export class YourRedisService {
  constructor(private readonly redisService: RedisService) {}

  async get(key: string): Promise<any> {
    return await this.redisService.get(key);
  }

  async set(key: string, value: any): Promise<void> {
    await this.redisService.set(key, value);
  }

  async hashSet(key: string, value: any): Promise<any> {
    return await this.redisService.hashSet(key, value);
  }

  async hashGet(key: string) {
    return await this.redisService.hashGet(key);
  }
}
```

&NewLine;

##### Change Log

> See [Changelog](CHANGELOG.md) for more information.

##### Contributing

> Contributions welcome! See [Contributing](CONTRIBUTING.md).

##### Author

> **Mostafa Gholami** [`mst-ghi`](https://github.com/mst-ghi)
