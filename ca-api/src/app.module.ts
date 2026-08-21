import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './infrastructure/config/config.module';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AuditModule } from './modules/audit/audit.module';
import { QueueModule } from './modules/queue/queue.module';
import { StorageModule } from './modules/storage/storage.module';
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { TagsModule } from './modules/tags/tags.module';
import { UsersModule } from './modules/users/users.module';
import { RequisitionsModule } from './modules/requisitions/requisitions.module';
import { JobDescriptionsModule } from './modules/job-descriptions/job-descriptions.module';
import { JobPostingsModule } from './modules/job-postings/job-postings.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { AdminSettingsModule } from './modules/admin/admin-settings.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { OffersModule } from './modules/offers/offers.module';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EmailModule } from './modules/email/email.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { GoogleCalendarModule } from './modules/integrations/google-calendar/google-calendar.module';
import { OrganisationsModule } from './modules/organisations/organisations.module';
import { TeamsIntegrationModule } from './modules/integrations/teams/teams.module';
import { ZoomIntegrationModule } from './modules/integrations/zoom/zoom.module';
import { WebexIntegrationModule } from './modules/integrations/webex/webex.module';

@Module({
  imports: [
    OrganisationsModule,
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    RbacModule,
    AuditModule,
    QueueModule,
    StorageModule,
    BootstrapModule,
    TagsModule,
    UsersModule,
    RequisitionsModule,
    JobDescriptionsModule,
    JobPostingsModule,
    DocumentsModule,
    CandidatesModule,
    AdminSettingsModule,
    ApplicationsModule,
    OffersModule,
    InterviewsModule,
    DashboardModule,
    EmailModule,
    TasksModule,
    GoogleCalendarModule,
    TeamsIntegrationModule,
    ZoomIntegrationModule,
    WebexIntegrationModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
