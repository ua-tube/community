import { Body, Controller, Post, Put, UseGuards } from '@nestjs/common';
import { CommunityService } from './community.service';
import { AuthUserGuard } from '../common/guards';
import { UserId } from '../common/decorators';
import { AddCommentDto, EditCommentDto, ReplyDto, VoteDto } from './dto';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @EventPattern('create_forum')
  async handleCreateForum(
    @Payload() payload: { videoId: string; creatorId: string },
  ) {
    await this.communityService.createForum(payload);
  }

  @EventPattern('unregister_forum')
  async unregisterForum(@Payload() payload: { videoId: string }) {
    await this.communityService.unregisterForum(payload.videoId);
  }

  @UseGuards(AuthUserGuard)
  @Post('comments')
  addComment(@Body() dto: AddCommentDto, @UserId() userId: string) {
    return this.communityService.addComment(dto, userId);
  }

  @UseGuards(AuthUserGuard)
  @Put('comments')
  editComment(@Body() dto: EditCommentDto, @UserId() userId: string) {
    return this.communityService.editComment(dto, userId);
  }

  @UseGuards(AuthUserGuard)
  @Post('comments/replies')
  reply(@Body() dto: ReplyDto, @UserId() userId: string) {
    return this.communityService.reply(dto, userId);
  }

  @UseGuards(AuthUserGuard)
  @Post('comments/votes')
  vote(@Body() dto: VoteDto, @UserId() userId: string) {
    return this.communityService.vote(dto, userId);
  }
}
