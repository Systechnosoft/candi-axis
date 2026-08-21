import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebexService } from './webex.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { RequireModule } from '../../rbac/decorators/require-module.decorator';

@ApiTags('Cisco Webex Integration')
@Controller('api/integrations/cisco_webex')
export class WebexController {
  constructor(private readonly webexService: WebexService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireModule('interviews', 'editor')
  @Post('generate-meet-link')
  @ApiOperation({
    summary: 'Pre-generate a Cisco Webex meeting link',
  })
  async generateMeetLink() {
    return this.webexService.generateMeetingLink();
  }
}
