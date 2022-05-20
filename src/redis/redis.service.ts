import { Observable, Observer } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { Inject, Injectable, Logger } from '@nestjs/common';

import { RedisSocketEventSendDTO } from '../redis-propagator/dto/socket-event-send.dto';
import { REDIS_IO, REDIS_PUBLISHER_CLIENT, REDIS_SUBSCRIBER_CLIENT } from './redis.constants';

// import { RedisClient } from "./redis.providers";

export interface RedisSubscribeMessage {
  readonly message: string;
  readonly channel: string;
}

@Injectable()
export class RedisService {
  public constructor(
    @Inject(REDIS_SUBSCRIBER_CLIENT)
    private readonly redisSubscriberClient,
    @Inject(REDIS_PUBLISHER_CLIENT)
    private readonly redisPublisherClient,
    @Inject(REDIS_IO)
    private readonly redisIo,
  ) {}

  /**
   * @deprecated
   * @param eventName
   * @returns
   */
  public fromEvent<T extends RedisSocketEventSendDTO>(
    eventName: string,
  ): Observable<T> {
    this.redisSubscriberClient.subscribe(eventName);

    return Observable.create((observer: Observer<RedisSubscribeMessage>) =>
      this.redisSubscriberClient.on('message', (channel, message) =>
        observer.next({ channel, message }),
      ),
    ).pipe(
      filter(({ channel }) => channel === eventName),
      map(({ message }) => JSON.parse(message)),
    );
  }

  public onEvent(eventName: string): Observable<any> {
    this.redisSubscriberClient.subscribe(eventName, () => {
      Logger.log(`Subscribed on ${eventName} channel`, 'Sockedis');
    });

    return new Observable((observer: Observer<RedisSubscribeMessage>) =>
      this.redisSubscriberClient.on('message', (channel, message) =>
        observer.next({ channel, message }),
      ),
    );
  }

  public async publish(channel: string, value: unknown): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      return this.redisPublisherClient.publish(
        channel,
        JSON.stringify(value),
        (error, reply) => {
          if (error) {
            return reject(error);
          }
          return resolve(reply);
        },
      );
    });
  }

  public async get(key: string) {
    return await this.redisIo.get(key, (err, result) => {
      if (err) {
        Logger.error(`fetch value of ${key} is failed`, 'RedisService');
      } else {
        return result;
      }
    });
  }

  public async set(key: string, value: any): Promise<any> {
    return await this.redisIo.set(key, value);
  }

  public async hashSet(key: string, value: any): Promise<any> {
    return await this.redisIo.hmset(key, value);
  }

  public async hashGet(key: string) {
    return await this.redisIo.hgetall(key, (err, result) => {
      if (err) {
        Logger.error(`fetch value of ${key} is failed`, 'RedisService');
      } else {
        return result;
      }
    });
  }
}
