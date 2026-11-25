import { IsString } from 'class-validator';

export class RejectPostDto {
  @IsString()
  rejectionReason!: string;
}
