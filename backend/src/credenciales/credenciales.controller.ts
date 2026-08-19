import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CredencialesService } from './credenciales.service';
import { CreateCredencialeDto } from './dto/create-credenciale.dto';
import { UpdateCredencialeDto } from './dto/update-credenciale.dto';

@Controller('credenciales')
export class CredencialesController {
  constructor(private readonly credencialesService: CredencialesService) {}

  @Post()
  create(@Body() createCredencialeDto: CreateCredencialeDto) {
    return this.credencialesService.create(createCredencialeDto);
  }

  @Get()
  findAll() {
    return this.credencialesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.credencialesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCredencialeDto: UpdateCredencialeDto,
  ) {
    return this.credencialesService.update(id, updateCredencialeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.credencialesService.remove(id);
  }
}
