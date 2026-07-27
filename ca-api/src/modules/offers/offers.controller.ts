import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequireModule } from '../rbac/decorators/require-module.decorator';

@ApiTags('Offers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  @RequireModule('offers', 'viewer')
  @ApiOperation({ summary: 'List all offers' })
  async findAll(@Query('search') search?: string) {
    return this.offersService.findAll({ search });
  }

  @Get('pending-applications')
  @RequireModule('offers', 'viewer')
  @ApiOperation({
    summary: 'Get applications in offered stage without an existing offer',
  })
  async getPending() {
    return this.offersService.getPendingApplications();
  }

  @Post()
  @RequireModule('offers', 'editor')
  @ApiOperation({ summary: 'Create a new offer' })
  async create(@Request() req: any, @Body() dto: any) {
    return this.offersService.create(req.user.atsUserId, dto);
  }

  @Patch(':id/status')
  @RequireModule('offers', 'editor')
  @ApiOperation({ summary: 'Update offer status' })
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.offersService.updateStatus(id, req.user.atsUserId, status);
  }
}
