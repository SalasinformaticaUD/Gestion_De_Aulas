import { IsUUID } from 'class-validator';

export class CreateAulaSoftwareDto {
  @IsUUID()
  aulaId!: string;

  @IsUUID()
  softwareId!: string;
}
