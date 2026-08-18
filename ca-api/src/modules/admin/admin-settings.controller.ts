import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminSettingsService } from './admin-settings.service';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequireModule } from '../rbac/decorators/require-module.decorator';

interface AuthenticatedRequest {
  user: {
    atsUserId: string;
    email: string;
  };
}

@ApiTags('Admin Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly adminService: AdminSettingsService) {}

  @Get('ai')
  @RequireModule('admin', 'viewer')
  @ApiOperation({ summary: 'Get AI parsing configuration' })
  async getAiConfig(@Request() req: AuthenticatedRequest) {
    return this.adminService.getAiConfig(req.user.email);
  }

  @Patch('ai')
  @RequireModule('admin', 'editor')
  @ApiOperation({ summary: 'Update AI parsing configuration' })
  async updateAiConfig(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateAiConfigDto,
  ) {
    return this.adminService.updateAiConfig(
      req.user.atsUserId,
      req.user.email,
      dto,
    );
  }

  @Delete('ai/key/:provider')
  @RequireModule('admin', 'editor')
  @ApiOperation({ summary: 'Clear API key for a specific provider' })
  async clearApiKey(
    @Request() req: AuthenticatedRequest,
    @Param('provider') provider: string,
  ) {
    return this.adminService.clearApiKey(
      req.user.atsUserId,
      req.user.email,
      provider,
    );
  }

  @Post('ai/models')
  @RequireModule('admin', 'editor')
  @ApiOperation({ summary: 'Fetch available models for an AI provider' })
  async fetchAvailableModels(
    @Request() req: AuthenticatedRequest,
    @Body() dto: { provider: string; api_key?: string },
  ) {
    return this.adminService.fetchAvailableModels(
      dto.provider,
      dto.api_key || '',
      req.user.email,
    );
  }

  @Get('ai/active')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get active AI provider status for resume parsing' })
  async getActiveAiProvider(@Request() req: AuthenticatedRequest) {
    return this.adminService.getActiveAiProviderStatus(req.user.email);
  }

  @Get('scoring-weights')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get candidate resume scoring weights' })
  async getScoringWeights(@Request() req: AuthenticatedRequest) {
    return this.adminService.getScoringWeights(req.user.email);
  }

  @Patch('scoring-weights')
  @RequireModule('admin', 'editor')
  @ApiOperation({ summary: 'Update candidate resume scoring weights' })
  async updateScoringWeights(
    @Request() req: AuthenticatedRequest,
    @Body() weights: Record<string, number>,
  ) {
    return this.adminService.updateScoringWeights(
      req.user.atsUserId,
      req.user.email,
      weights,
    );
  }

  @Get('configurations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get interview meeting provider configurations' })
  async getConfigurations(@Request() req: AuthenticatedRequest) {
    return this.adminService.getConfigurations(req.user.email);
  }

  @Get('providers')
  @RequireModule('admin', 'viewer')
  @ApiOperation({
    summary: 'Get available interview meeting providers and schemas',
  })
  async getProviders() {
    return this.adminService.getProviders();
  }

  @Post('configurations')
  @RequireModule('admin', 'editor')
  @ApiOperation({ summary: 'Save interview meeting provider configuration' })
  async saveProviderConfig(
    @Request() req: AuthenticatedRequest,
    @Body() body: Record<string, any>,
  ) {
    return this.adminService.saveConfiguration(
      req.user.atsUserId,
      req.user.email,
      body,
    );
  }

  @Post('configurations/:id/test')
  @RequireModule('admin', 'editor')
  @ApiOperation({ summary: 'Test interview meeting provider configuration' })
  async testProviderConfig(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.adminService.testProviderConfig(req.user.atsUserId, id);
  }

  @Post('configurations/:id/activate')
  @RequireModule('admin', 'editor')
  @ApiOperation({
    summary: 'Activate interview meeting provider configuration',
  })
  async activateProviderConfig(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.adminService.activateProviderConfig(req.user.atsUserId, id);
  }

  @Post('configurations/:id/deactivate')
  @RequireModule('admin', 'editor')
  @ApiOperation({
    summary: 'Deactivate interview meeting provider configuration',
  })
  async deactivateProviderConfig(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.adminService.deactivateProviderConfig(req.user.atsUserId, id);
  }

  @Post('configurations/:id/default')
  @RequireModule('admin', 'editor')
  @ApiOperation({
    summary: 'Set default interview meeting provider configuration',
  })
  async setDefaultProviderConfig(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.adminService.setDefaultProviderConfig(req.user.atsUserId, id);
  }
}
