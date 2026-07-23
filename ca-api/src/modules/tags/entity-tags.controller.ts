import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { EntityTagsService } from './entity-tags.service';
import { AssignEntityTagDto } from './dto/assign-entity-tag.dto';
import { ReplaceEntityTagsDto } from './dto/replace-entity-tags.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../rbac/decorators/require-module.decorator';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('entity-tags/:entityType/:entityId')
@UseGuards(JwtAuthGuard, RbacGuard)
export class EntityTagsController {
  constructor(private readonly entityTagsService: EntityTagsService) {}

  @Get()
  @RequireModule('tags', 'viewer')
  getTags(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.entityTagsService.getEntityTags(entityType, entityId);
  }

  @Post()
  @RequireModule('tags', 'editor')
  assignTag(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user: any,
    @Body() assignDto: AssignEntityTagDto,
  ) {
    return this.entityTagsService.assignTag(
      entityType,
      entityId,
      user.atsUserId,
      assignDto,
    );
  }

  @Delete(':tagId')
  @RequireModule('tags', 'editor')
  removeTag(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('tagId') tagId: string,
    @CurrentUser() user: any,
  ) {
    return this.entityTagsService.removeTag(
      entityType,
      entityId,
      tagId,
      user.atsUserId,
    );
  }

  @Put('replace')
  @RequireModule('tags', 'editor')
  replaceTags(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user: any,
    @Body() replaceDto: ReplaceEntityTagsDto,
  ) {
    return this.entityTagsService.replaceTags(
      entityType,
      entityId,
      user.atsUserId,
      replaceDto,
    );
  }
}
