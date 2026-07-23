import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResumeAiParserService } from './resume-ai-parser.service';
import { ApplicationAiRatingService } from './application-ai-rating.service';
import { AdminSettingsModule } from '../admin/admin-settings.module';

@Module({
  imports: [ConfigModule, AdminSettingsModule],
  providers: [ResumeAiParserService, ApplicationAiRatingService],
  exports: [ResumeAiParserService, ApplicationAiRatingService],
})
export class AiModule {}
