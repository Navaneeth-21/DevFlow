import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDecisionLogDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  description!: string;
}
