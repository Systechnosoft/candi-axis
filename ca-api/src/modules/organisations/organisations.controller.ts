import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganisationsService } from './organisations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequireModule } from '../rbac/decorators/require-module.decorator';

@ApiTags('Organisations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('organisations')
export class OrganisationsController {
  constructor(private readonly organisationsService: OrganisationsService) {}

  @Get()
  @RequireModule('organisations', 'viewer')
  @ApiOperation({ summary: 'Get list of organisations with pagination' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.organisationsService.findAll({ page, limit, search });
  }

  @Get(':id')
  @RequireModule('organisations', 'viewer')
  @ApiOperation({ summary: 'Get details of a single organisation' })
  async findOne(@Param('id') id: string) {
    return this.organisationsService.findOne(id);
  }

  @Post()
  @RequireModule('organisations', 'editor')
  @ApiOperation({ summary: 'Create a new organisation' })
  async create(@Body() dto: any) {
    return this.organisationsService.create(dto);
  }

  @Patch(':id')
  @RequireModule('organisations', 'editor')
  @ApiOperation({ summary: 'Update organisation details' })
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.organisationsService.update(id, dto);
  }

  @Delete(':id')
  @RequireModule('organisations', 'editor')
  @ApiOperation({ summary: 'Soft delete / deactivate an organisation' })
  async remove(@Param('id') id: string) {
    return this.organisationsService.remove(id);
  }
}
