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
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../rbac/decorators/require-module.decorator';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('tags')
@UseGuards(JwtAuthGuard, RbacGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @RequireModule('tags', 'editor')
  create(
    @CurrentUser() user: { atsUserId: string },
    @Body() createTagDto: CreateTagDto,
  ) {
    return this.tagsService.createTag(user.atsUserId, null, createTagDto);
  }

  @Get()
  @RequireModule('tags', 'viewer')
  findAll(
    @CurrentUser() user: { atsUserId: string },
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('active') active?: string,
  ) {
    return this.tagsService.getTags(user.atsUserId, { search, type, active });
  }

  @Get('suggestions')
  @RequireModule('tags', 'viewer')
  getSuggestions(
    @CurrentUser() user: { atsUserId: string },
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.tagsService.getSuggestions(user.atsUserId, type, search);
  }

  @Get(':id')
  @RequireModule('tags', 'viewer')
  findOne(@Param('id') id: string) {
    return this.tagsService.getTagById(id);
  }

  @Patch(':id')
  @RequireModule('tags', 'editor')
  update(
    @Param('id') id: string,
    @CurrentUser() user: { atsUserId: string },
    @Body() updateTagDto: UpdateTagDto,
  ) {
    return this.tagsService.updateTag(id, user.atsUserId, updateTagDto);
  }

  @Delete(':id')
  @RequireModule('tags', 'editor')
  remove(@Param('id') id: string, @CurrentUser() user: { atsUserId: string }) {
    return this.tagsService.deleteTag(id, user.atsUserId);
  }
}
