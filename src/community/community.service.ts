import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { AddCommentDto, EditCommentDto, ReplyDto, VoteDto } from './dto';

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createForum(payload: { videoId: string; creatorId: string }) {
    await this.prisma.videoForum.create({
      data: {
        ...payload,
        status: 'Registered',
        allowedToComment: true,
        videoCommentsCount: 0,
        rootVideoCommentsCount: 0,
      },
    });
  }

  async unregisterForum(videoId: string) {
    await this.prisma.videoForum.update({
      where: { videoId },
      data: { status: 'Unregistered' },
    });
  }

  async addComment(dto: AddCommentDto, creatorId: string) {
    await this.checkForum(dto.videoId);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.videoComment.create({
          data: {
            creatorId,
            ...dto,
            likesCount: 0,
            dislikesCount: 0,
            repliesCount: 0,
          },
        });
        await tx.videoForum.update({
          where: { videoId: dto.videoId },
          data: {
            videoCommentsCount: { increment: 1 },
            rootVideoCommentsCount: { increment: 1 },
          },
        });
      });
    } catch (e: any) {
      this.logger.error(e);
      throw new BadRequestException(e?.code || -1);
    }
  }

  async editComment(dto: EditCommentDto, creatorId: string) {
    const comment = await this.prisma.videoComment.findUnique({
      where: { id: dto.commentId },
      select: { creatorId: true },
    });

    if (!comment) throw new BadRequestException('Comment not found');
    if (comment.creatorId !== creatorId) throw new ForbiddenException();

    return this.prisma.videoComment.update({
      where: { id: dto.commentId },
      data: {
        comment: dto.comment,
        editedAt: new Date(),
      },
    });
  }

  async reply(dto: ReplyDto, creatorId: string) {
    await this.checkForum(dto.videoId);

    const parentComment = await this.prisma.videoComment.findUnique({
      where: { id: dto.parentCommentId },
      select: { id: true },
    });

    if (!parentComment)
      throw new BadRequestException('Parent comment not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.videoComment.create({
        data: {
          ...dto,
          creatorId,
          repliesCount: 0,
          dislikesCount: 0,
          likesCount: 0,
        },
      });
      await Promise.all([
        tx.videoComment.update({
          where: { id: dto.parentCommentId },
          data: { repliesCount: { increment: 1 } },
        }),
        tx.videoForum.update({
          where: { videoId: dto.videoId },
          data: { videoCommentsCount: { increment: 1 } },
        }),
      ]);
    });
  }

  async vote(dto: VoteDto, creatorId: string) {
    await this.checkForum(dto.videoId);

    const comment = await this.prisma.videoComment.findUnique({
      where: { id: dto.commentId },
      select: { id: true },
    });

    if (!comment) throw new BadRequestException('Comment not found');

    return this.prisma.$transaction(async (tx) => {
      const vote = await tx.videoCommentVote.findUnique({
        where: {
          creatorId_videoCommentId: {
            creatorId,
            videoCommentId: dto.commentId,
          },
        },
        select: { type: true },
      });

      if (dto.voteType === 'None' && vote?.type === 'None')
        throw new BadRequestException(
          'Comment without votes cannot be voted with None type',
        );

      if (vote?.type && vote.type === dto.voteType)
        throw new BadRequestException('Specified vote equals to existing');

      await tx.videoCommentVote.upsert({
        where: {
          creatorId_videoCommentId: {
            creatorId,
            videoCommentId: dto.commentId,
          },
        },
        update: { type: dto.voteType },
        create: {
          creatorId,
          videoCommentId: dto.commentId,
          videoId: dto.videoId,
          type: dto.voteType,
        },
      });

      await tx.videoComment.update({
        where: { id: dto.commentId },
        data: {
          [dto.voteType === 'Like' ? 'likesCount' : 'dislikesCount']: {
            increment: 1,
          },
          ...(vote &&
            vote.type !== 'None' && {
              [dto.voteType === 'Like' ? 'dislikesCount' : 'likesCount']: {
                decrement: 1,
              },
            }),
        },
      });
    });
  }

  private async checkForum(videoId: string) {
    const videoForum = await this.prisma.videoForum.findUnique({
      where: { videoId },
      select: { status: true, allowedToComment: true },
    });

    if (videoForum.status === 'Unregistered' || !videoForum.allowedToComment)
      throw new BadRequestException(`Video forum (${videoId}) closed`);
  }
}
