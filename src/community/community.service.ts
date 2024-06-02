import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import {
  AddCommentDto,
  EditCommentDto,
  PaginationDto,
  ReplyDto,
  VoteDto,
} from './dto';
import { SUBSCRIPTIONS_SVC, VIDEO_MANAGER_SVC } from '../common/constants';
import { ClientRMQ } from '@nestjs/microservices';
import { PersistNotificationEvent, UpdateVideoCommentsMetrics } from '../common/events';

@Injectable()
export class CommunityService implements OnModuleInit {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SUBSCRIPTIONS_SVC)
    private readonly subscriptionsClient: ClientRMQ,
    @Inject(VIDEO_MANAGER_SVC)
    private readonly videoManagerClient: ClientRMQ,
  ) {}

  onModuleInit(): void {
    this.subscriptionsClient
      .connect()
      .then(() =>
        this.logger.log(`${SUBSCRIPTIONS_SVC} connection established`),
      )
      .catch(() => this.logger.error(`${SUBSCRIPTIONS_SVC} connection failed`));
    this.videoManagerClient
      .connect()
      .then(() =>
        this.logger.log(`${VIDEO_MANAGER_SVC} connection established`),
      )
      .catch(() => this.logger.error(`${VIDEO_MANAGER_SVC} connection failed`));
  }

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

  async getComments(videoId: string, pagination: PaginationDto) {
    return this.prisma.videoComment.findMany({
      where: { videoId, parentCommentId: null },
      omit: { videoId: true, parentCommentId: true },
      include: {
        creator: true,
        replies: {
          omit: { videoId: true },
          include: { creator: true },
        },
      },
      take: pagination.perPage,
      skip: (pagination.page - 1) * pagination.perPage,
    });
  }

  async addComment(dto: AddCommentDto, creatorId: string) {
    const forum = await this.checkForum(dto.videoId);
    const creator = await this.findCreatorOrThrow(creatorId);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.videoComment.create({
          data: {
            creatorId,
            ...dto,
            likesCount: 0,
            dislikesCount: 0,
            repliesCount: 0,
          },
        });
        
        const metrics = await tx.videoForum.update({
          where: { videoId: dto.videoId },
          data: {
            videoCommentsCount: { increment: 1 },
            rootVideoCommentsCount: { increment: 1 },
          },
        });

        this.videoManagerClient.emit(
          'update_video_comments_metrics',
          new UpdateVideoCommentsMetrics(
            dto.videoId,
            metrics.videoCommentsCount,
            new Date()
          )
        )
      });

      this.subscriptionsClient.emit(
        'persist_notification',
        new PersistNotificationEvent(
          forum.creatorId,
          `${creator.displayName} залишив коментар під твоїм відео`,
          `/dashboard/videos/${dto.videoId}?tab=comments`,
          {
            nickname: creator.nickname,
            thumbnailUrl: creator.thumbnailUrl,
          },
        ),
      );
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

    try {
      await this.prisma.videoComment.update({
        where: { id: dto.commentId },
        data: {
          comment: dto.comment,
          editedAt: new Date(),
        },
      });
      return { status: true };
    } catch (e: unknown) {
      this.logger.error(e);
      return { status: false };
    }
  }

  async deleteComment(commentId: string, creatorId: string) {
    const comment = await this.prisma.videoComment.findUnique({
      where: { id: commentId },
      select: { creatorId: true },
    });

    if (!comment) throw new BadRequestException('Comment not found');
    if (comment.creatorId !== creatorId) throw new ForbiddenException();

    try {
      await this.prisma.videoComment.delete({
        where: { id: commentId },
        select: { id: true },
      });

      return { status: true };
    } catch (e: unknown) {
      this.logger.error(e);
      return { status: false };
    }
  }

  async reply(dto: ReplyDto, creatorId: string) {
    await this.checkForum(dto.videoId);

    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
    });

    if (!creator) throw new BadRequestException('Creator not found');

    const parentComment = await this.prisma.videoComment.findUnique({
      where: { id: dto.parentCommentId },
      select: { creatorId: true },
    });

    if (!parentComment)
      throw new BadRequestException('Parent comment not found');

    try {
      await this.prisma.$transaction([
        this.prisma.videoComment.create({
          data: {
            ...dto,
            creatorId,
            repliesCount: 0,
            dislikesCount: 0,
            likesCount: 0,
          },
        }),
        this.prisma.videoComment.update({
          where: { id: dto.parentCommentId },
          data: { repliesCount: { increment: 1 } },
        }),
        this.prisma.videoForum.update({
          where: { videoId: dto.videoId },
          data: { videoCommentsCount: { increment: 1 } },
        }),
      ]);

      if (parentComment.creatorId !== creatorId) {
        this.subscriptionsClient.emit(
          'persist_notification',
          new PersistNotificationEvent(
            parentComment.creatorId,
            `${creator.displayName} відповів на твій коментар!`,
            `/watch?videoId=${dto.videoId}&commentId=${dto.parentCommentId}`,
            {
              nickname: creator.nickname,
              thumbnailUrl: creator.thumbnailUrl,
            },
          ),
        );
      }

      return { status: true };
    } catch (e: unknown) {
      this.logger.error(e);
      return { status: false };
    }
  }

  async vote(dto: VoteDto, creatorId: string) {
    await this.checkForum(dto.videoId);

    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
    });

    if (!creator) throw new BadRequestException('Creator not found');

    const comment = await this.prisma.videoComment.findUnique({
      where: { id: dto.commentId },
      select: { id: true },
    });

    if (!comment) throw new BadRequestException('Comment not found');

    try {
      await this.prisma.$transaction(async (tx) => {
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

        const targetComment = await tx.videoComment.update({
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
          select: { creatorId: true },
        });

        if (dto.voteType === 'Like' && targetComment.creatorId !== creatorId) {
          this.subscriptionsClient.emit(
            'persist_notification',
            new PersistNotificationEvent(
              targetComment.creatorId,
              `Твій коментар сподобався для ${creator.displayName}!`,
              `/watch?videoId=${dto.videoId}&commentId=${dto.commentId}`,
              {
                nickname: creator.nickname,
                thumbnailUrl: creator.thumbnailUrl,
              },
            ),
          );
        }
      });

      return { status: true };
    } catch (e: unknown) {
      this.logger.error(e);
      return { status: false };
    }
  }

  async getVotes(videoId: string, creatorId: string) {
    const votes = await this.prisma.videoCommentVote.findMany({
      where: { creatorId, videoId },
      select: { videoCommentId: true, type: true },
    });

    return {
      likedCommentIds: votes.filter((x) => x.type === 'Like'),
      dislikedCommentIds: votes.filter((x) => x.type === 'Dislike'),
    };
  }

  async getVideoForum(videoId: string, perPage: string, creatorId?: string) {
    if (!perPage) throw new BadRequestException('perPage is required');

    const videoForum = await this.prisma.videoForum.findUnique({
      where: { videoId },
      select: {
        videoCommentsCount: true,
        rootVideoCommentsCount: true,
      },
    });

    if (!videoForum) throw new BadRequestException('Video forum not found');

    const userComments = [];
    const votes = { likedCommentIds: [], dislikedCommentIds: [] };

    if (creatorId) {
      const [videoComments, videoVotes] = await Promise.all([
        this.prisma.videoComment.findMany({
          where: { videoId, creatorId, parentCommentId: null },
          omit: { videoId: true, parentCommentId: true },
          include: {
            creator: true,
            replies: {
              omit: { videoId: true },
              include: { creator: true },
            },
          },
        }),
        this.getVotes(videoId, creatorId),
      ]);

      userComments.push(...videoComments);
      votes.likedCommentIds = videoVotes.likedCommentIds;
      votes.dislikedCommentIds = videoVotes.dislikedCommentIds;
    }

    const comments = await this.getComments(videoId, {
      page: 1,
      perPage: Number(perPage),
    });

    return {
      commentsCount: videoForum.videoCommentsCount,
      rootCommentsCount: videoForum.rootVideoCommentsCount,
      ...votes,
      Comments:
        userComments.length > 0
          ? comments.filter((x) => x.creatorId !== creatorId)
          : comments,
      UserComments: userComments,
    };
  }

  private async checkForum(videoId: string) {
    const videoForum = await this.prisma.videoForum.findUnique({
      where: { videoId },
      select: { status: true, allowedToComment: true, creatorId: true },
    });

    if (videoForum.status === 'Unregistered' || !videoForum.allowedToComment)
      throw new BadRequestException(`Video forum (${videoId}) closed`);

    return videoForum;
  }

  private async findCreator(creatorId: string) {
    return this.prisma.creator.findUnique({
      where: { id: creatorId },
    });
  }

  private async findCreatorOrThrow(creatorId: string) {
    const creator = await this.findCreator(creatorId);
    if (!creator) throw new BadRequestException('Creator not found');
    return creator;
  }
}
