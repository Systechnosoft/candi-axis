import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ZoomService } from './zoom.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { RequireModule } from '../../rbac/decorators/require-module.decorator';

@ApiTags('Zoom Integration')
@Controller('api/integrations/zoom')
export class ZoomController {
  constructor(private readonly zoomService: ZoomService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireModule('interviews', 'editor')
  @Post('generate-meet-link')
  @ApiOperation({
    summary: 'Pre-generate a Zoom meeting link',
  })
  async generateMeetLink() {
    return this.zoomService.generateMeetingLink();
  }
}
