import { Module } from '@nestjs/common';
import { OrganisationsController } from './organisations.controller';
import { OrganisationsService } from './organisations.service';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [DatabaseModule, RbacModule],
  controllers: [OrganisationsController],
  providers: [OrganisationsService],
  exports: [OrganisationsService],
})
export class OrganisationsModule {}
