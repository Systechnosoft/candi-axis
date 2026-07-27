import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { AuthService, SupabaseJwtPayload } from '../auth.service';

/**
 * Validates Supabase-issued JWTs using the Supabase JWKS endpoint.
 * On successful validation, resolves the ATS user mapping so req.user
 * contains { atsUserId, email } — the ATS internal user identity.
 */
@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(
  Strategy,
  'supabase-jwt',
) {
  private readonly logger = new Logger(SupabaseJwtStrategy.name);

  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    const supabaseUrl = config.get<string>('SUPABASE_URL');

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is not defined in environment');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      }),
      algorithms: ['RS256', 'ES256', 'HS256'],
    });

    this.logger.debug(
      `SupabaseJwtStrategy initialized with JWKS URI: ${supabaseUrl}/auth/v1/.well-known/jwks.json`,
    );
  }

  async validate(
    payload: SupabaseJwtPayload,
  ): Promise<{ atsUserId: string; email: string }> {
    this.logger.debug(
      `SupabaseJwtStrategy.validate() called for: ${payload.email}`,
    );
    if (!payload.sub || !payload.email) {
      this.logger.warn(`Invalid payload: ${JSON.stringify(payload)}`);
      throw new UnauthorizedException('Invalid token payload');
    }
    return this.authService.resolveAtsUser(payload.sub, payload.email);
  }
}
