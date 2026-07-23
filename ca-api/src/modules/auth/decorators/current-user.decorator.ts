import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the ATS-resolved user identity from the request.
 * After Supabase JWT validation + ATS user mapping, req.user = { atsUserId, email }.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
