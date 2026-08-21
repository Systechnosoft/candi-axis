import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { RbacModule } from '../../rbac/rbac.module';

@Module({
  imports: [RbacModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsIntegrationModule {}
