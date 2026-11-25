import { IsString } from 'class-validator';

export class RequestChangesDto {
  @IsString()
  comment!: string;
}
