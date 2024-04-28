import { IsNotEmpty, IsString, IsUUID, Length } from 'class-validator';

export class EditCommentDto {
  @IsNotEmpty()
  @IsUUID(4)
  commentId: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 9999)
  comment: string;
}
