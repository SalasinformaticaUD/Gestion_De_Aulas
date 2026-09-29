import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ImportarRespuestaFormsDto } from './dto/importar-respuesta-forms.dto';
import { FormsIntegrationKeyGuard } from './forms-integration-key.guard';
import { ImportacionSolicitudesService } from './importacion-solicitudes.service';

@Controller('integraciones/forms/solicitudes-instalacion')
export class FormsSolicitudesController {
  constructor(
    private readonly importacionService: ImportacionSolicitudesService,
  ) {}

  @Post()
  @Public()
  @UseGuards(FormsIntegrationKeyGuard)
  @HttpCode(HttpStatus.OK)
  recibir(@Body() dto: ImportarRespuestaFormsDto) {
    return this.importacionService.importarRespuestaForms(dto);
  }
}
