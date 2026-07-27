import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SupabaseJwtStrategy } from './strategies/jwt.strategy';
import { RbacModule } from '../rbac/rbac.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PassportModule, RbacModule, AuditModule],
  providers: [AuthService, SupabaseJwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
