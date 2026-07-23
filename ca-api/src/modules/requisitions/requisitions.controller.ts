import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequisitionsService } from './requisitions.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { UpdateRequisitionDto } from './dto/update-requisition.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../rbac/decorators/require-module.decorator';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('requisitions')
@UseGuards(JwtAuthGuard, RbacGuard)
export class RequisitionsController {
  constructor(private readonly requisitionsService: RequisitionsService) {}

  @Post()
  @RequireModule('requisitions', 'editor')
  create(
    @CurrentUser() user: any,
    @Body() createRequisitionDto: CreateRequisitionDto,
  ) {
    return this.requisitionsService.createRequisition(
      user.atsUserId,
      createRequisitionDto,
    );
  }

  @Get()
  @RequireModule('requisitions', 'viewer')
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('department') department?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.requisitionsService.getRequisitions({
      search,
      status,
      department,
      activeOnly,
    });
  }

  @Get(':id')
  @RequireModule('requisitions', 'viewer')
  findOne(@Param('id') id: string) {
    return this.requisitionsService.getRequisitionById(id);
  }

  @Patch(':id')
  @RequireModule('requisitions', 'editor')
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateRequisitionDto: UpdateRequisitionDto,
  ) {
    return this.requisitionsService.updateRequisition(
      id,
      user.atsUserId,
      updateRequisitionDto,
    );
  }

  @Delete(':id')
  @RequireModule('requisitions', 'editor')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.requisitionsService.deleteRequisition(id, user.atsUserId);
  }
}
