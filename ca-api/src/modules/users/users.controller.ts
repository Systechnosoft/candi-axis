import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../rbac/decorators/require-module.decorator';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RbacGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('lookups')
  getLookups() {
    return this.usersService.getLookups();
  }

  @Get('options/hiring-managers')
  getHiringManagers() {
    return this.usersService.getHiringManagers();
  }

  @Get('options/hr-recruiters')
  getHrRecruiters() {
    return this.usersService.getHrRecruiters();
  }

  @Get('options/interviewers')
  getInterviewers() {
    return this.usersService.getInterviewers();
  }

  @Post()
  @RequireModule('users', 'editor')
  create(@CurrentUser() user: any, @Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(user.atsUserId, createUserDto);
  }

  @Get()
  @RequireModule('users', 'viewer')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequireModule('users', 'viewer')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @RequireModule('users', 'editor')
  update(
    @Param('id') id: string,

    @CurrentUser() user: any,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, user.atsUserId, updateUserDto);
  }

  @Patch(':id/status')
  @RequireModule('users', 'editor')
  updateStatus(
    @Param('id') id: string,

    @CurrentUser() user: any,
    @Body() updateStatusDto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(
      id,
      user.atsUserId,
      updateStatusDto,
    );
  }

  @Delete(':id')
  @RequireModule('users', 'editor')
  delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.usersService.deleteUser(id, user.atsUserId);
  }
}
