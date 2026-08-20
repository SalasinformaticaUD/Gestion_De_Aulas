import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class BuscarAulasPorSoftwareDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  softwareIds!: string[];
}
