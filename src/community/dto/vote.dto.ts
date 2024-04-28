import { VideoCommentVoteType } from '@prisma/client';
import { IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class VoteDto {
  @IsNotEmpty()
  @IsUUID(4)
  videoId: string;

  @IsNotEmpty()
  @IsUUID(4)
  commentId: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(Object.keys(VideoCommentVoteType))
  voteType: VideoCommentVoteType;
}
