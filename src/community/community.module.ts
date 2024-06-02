import { Module } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { PrismaModule } from '../prisma';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SUBSCRIPTIONS_SVC, VIDEO_MANAGER_SVC } from '../common/constants';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    ClientsModule.registerAsync([
      {
        name: SUBSCRIPTIONS_SVC,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.getOrThrow<string>('RABBITMQ_URL')],
            queue: configService.getOrThrow<string>(
              'RABBITMQ_SUBSCRIPTIONS_QUEUE',
            ),
            persistent: true,
            queueOptions: {
              durable: false,
            },
          },
        }),
      },
      {
        name: VIDEO_MANAGER_SVC,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.getOrThrow<string>('RABBITMQ_URL')],
            queue: configService.getOrThrow<string>(
              'RABBITMQ_VIDEO_MANAGER_QUEUE',
            ),
            persistent: true,
            queueOptions: {
              durable: false,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
