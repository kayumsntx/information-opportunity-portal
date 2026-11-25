import { IsOptional, IsString } from 'class-validator';

export class SubmitPostDto {
  @IsOptional()
  @IsString()
  changeLog?: string;
}
