import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { UpsertCreatorDto } from './dto';

@Injectable()
export class CreatorsService {
  private readonly logger = new Logger(CreatorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertCreator(payload: UpsertCreatorDto) {
    const creator = await this.prisma.creator.findUnique({
      where: { id: payload.id },
      select: { id: true },
    });

    if (creator) {
      try {
        await this.prisma.creator.update({
          where: { id: payload.id },
          data: {
            displayName: payload.displayName,
            nickname: payload.nickname,
            thumbnailUrl: payload.thumbnailUrl,
          },
        });
        this.logger.log(`Creator (${payload.id}) is updated`);
      } catch {
        this.logger.error(
          `An error occurred when updating creator (${payload.id})`,
        );
      }
    } else {
      try {
        await this.prisma.creator.create({ data: payload });
        this.logger.log(`Creator (${payload.id}) is created`);
      } catch {
        this.logger.error(
          `An error occurred when creating creator (${payload.id})`,
        );
      }
    }
  }
}
