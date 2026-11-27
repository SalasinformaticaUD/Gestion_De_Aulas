import { PersonalDataExtractionService } from './personal-data-extraction.service';
import { DocumentValidationService } from './document-validation.service';
import { DocumentalAccessGuard } from './documental-access.guard';
import { DescartarPdfInterceptor } from './descartar-pdf.interceptor';
import { PersonalDataComparisonService } from './personal-data-comparison.service';
import { PdfTextService } from './pdf-text.service';
import { DocumentClassificationService } from './document-classification.service';
import { PdfValidationService } from './pdf-validation.service';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VerificadorDocumentalController } from './verificador-documental.controller';
import { VerificadorDocumentalService } from './verificador-documental.service';

@Module({
  imports: [PrismaModule],
  controllers: [VerificadorDocumentalController],
  providers: [
    VerificadorDocumentalService,
    PdfValidationService,
    PdfTextService,
    PersonalDataExtractionService,
    PersonalDataComparisonService,
    DocumentValidationService,
    DocumentalAccessGuard,
    DescartarPdfInterceptor,
    DocumentClassificationService,
  ],
})
export class VerificadorDocumentalModule {}
