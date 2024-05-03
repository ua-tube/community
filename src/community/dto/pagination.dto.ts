import { IsNotEmpty, IsNumber, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class PaginationDto {
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => +value)
  page: number;

  @IsNotEmpty()
  @IsNumber()
  @Max(100)
  @Transform(({ value }) => +value)
  perPage: number;
}
