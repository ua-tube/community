import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { AuthUserGuard, OptionalAuthUserGuard } from '../common/guards';
import { UserId } from '../common/decorators';
import {
  AddCommentDto,
  EditCommentDto,
  PaginationDto,
  ReplyDto,
  VoteDto,
} from './dto';
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

  @Get('comments/:videoId')
  getComments(
    @Param('videoId', ParseUUIDPipe) videoId: string,
    @Query() query: PaginationDto,
  ) {
    return this.communityService.getComments(videoId, query);
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
  @Delete('comments/:commentId')
  deleteComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @UserId() userId: string,
  ) {
    return this.communityService.deleteComment(commentId, userId);
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

  @UseGuards(AuthUserGuard)
  @Get('comments/votes/:videoId')
  getUserVotes(
    @Param('videoId', ParseUUIDPipe) videoId: string,
    @UserId() userId: string,
  ) {
    return this.communityService.getVotes(videoId, userId);
  }

  @UseGuards(OptionalAuthUserGuard)
  @Get(':videoId')
  getVideoForum(
    @Param('videoId', ParseUUIDPipe) videoId: string,
    @Query('perPage') perPage: string,
    @UserId() userId: string,
  ) {
    return this.communityService.getVideoForum(videoId, perPage, userId);
  }
}
