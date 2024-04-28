import { IsNotEmpty, IsString, IsUUID, Length } from 'class-validator';

export class AddCommentDto {
  @IsNotEmpty()
  @IsUUID(4)
  videoId: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 9999)
  comment: string;
}
