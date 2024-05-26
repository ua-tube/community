import { randomUUID } from 'crypto';

type Channel = {
  nickname: string;
  thumbnailUrl: string;
};

export class PersistNotificationEvent {
  notificationId: string;
  creatorId: string;
  message: string;
  url: string;
  channel: Channel;

  constructor(
    creatorId: string,
    message: string,
    url: string,
    channel: Channel,
  ) {
    this.notificationId = randomUUID();
    this.creatorId = creatorId;
    this.message = message;
    this.url = url;
    this.channel = channel;
  }
}
