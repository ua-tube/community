import { Controller } from '@nestjs/common';
import { CreatorsService } from './creators.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { UpsertCreator } from './types';

@Controller()
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @EventPattern('upsert_creator')
  async handleUpsertCreator(@Payload() payload: UpsertCreator) {
    await this.creatorsService.upsertCreator(payload);
  }
}
