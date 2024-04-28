import { IsNotEmpty, IsString, IsUUID, Length } from 'class-validator';

export class ReplyDto {
  @IsNotEmpty()
  @IsUUID(4)
  videoId: string;

  @IsNotEmpty()
  @IsUUID(4)
  parentCommentId: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 9999)
  comment: string;
}
