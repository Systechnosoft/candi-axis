import {
  Controller,
  Post,
  Body,
  UseGuards,
  ValidationPipe,
  UploadedFile,
  UseInterceptors,
  Get,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { RegisterDocumentDto } from './dto/register-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  register(
    @CurrentUser() user: any,
    @Body(new ValidationPipe({ whitelist: true })) dto: RegisterDocumentDto,
  ) {
    return this.documentsService.registerUnattachedResume(user.atsUserId, dto);
  }

  @Post('upload-resume')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadResume(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.uploadResume(user.atsUserId, file);
  }

  @Get('candidate/:candidateId')
  @UseGuards(JwtAuthGuard)
  async getCandidatePrimaryDocument(@Param('candidateId') candidateId: string) {
    const doc = await this.documentsService.findPrimaryResumeForCandidate(candidateId);
    if (!doc) {
      throw new NotFoundException('No primary resume found for candidate');
    }
    return doc;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getDocument(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Get(':id/download')
  async downloadDocument(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.documentsService.findOne(id);
    const buffer = await this.documentsService.downloadFile(doc.storage_bucket, doc.storage_key);
    res.setHeader('Content-Type', doc.mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.original_file_name}"`);
    res.send(buffer);
  }
}
