import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResumeAiParserService } from './resume-ai-parser.service';
import { ApplicationAiRatingService } from './application-ai-rating.service';
import { AdminSettingsModule } from '../admin/admin-settings.module';
import { AiExecutionService } from './ai-execution.service';
import { DatabaseModule } from '../../infrastructure/database/database.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => AdminSettingsModule),
    DatabaseModule,
  ],
  providers: [
    ResumeAiParserService,
    ApplicationAiRatingService,
    AiExecutionService,
  ],
  exports: [
    ResumeAiParserService,
    ApplicationAiRatingService,
    AiExecutionService,
  ],
})
export class AiModule {}
