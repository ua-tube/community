import { Controller } from '@nestjs/common';
import { CreatorsService } from './creators.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { UpsertCreatorDto } from './dto';

@Controller()
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @EventPattern('upsert_creator')
  async handleUpsertCreator(@Payload() payload: UpsertCreatorDto) {
    await this.creatorsService.upsertCreator(payload);
  }
}
