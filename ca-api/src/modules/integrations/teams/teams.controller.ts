import { Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { RequireModule } from '../../rbac/decorators/require-module.decorator';

@ApiTags('Microsoft Teams Integration')
@Controller('api/integrations/microsoft_teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireModule('interviews', 'editor')
  @Post('generate-meet-link')
  @ApiOperation({
    summary: 'Pre-generate a Microsoft Teams meeting link',
  })
  async generateMeetLink(@Request() req: any) {
    return this.teamsService.generateMeetingLink(req.user.atsUserId);
  }
}
