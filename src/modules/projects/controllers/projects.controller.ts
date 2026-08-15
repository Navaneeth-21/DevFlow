import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';

import { WorkspaceAccessGuard } from '../../workspaces/guards/workspace-access.guard.js';
import { WorkspaceRoles } from '../../workspaces/decorators/workspace-roles.decorator.js';

import { WorkspaceRole } from '../../../../generated/prisma/client.js';

import { CreateProjectDto } from '../dto/create-project.dto.js';
import { UpdateProjectDto } from '../dto/update-project.dto.js';
import { ListProjectsDto } from '../dto/list-projects.dto.js';

import { ProjectsService } from '../services/projects.service.js';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('workspaces/:workspaceId/projects')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  create(
    @Param('workspaceId') workspaceId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(workspaceId, request.user.userId, dto);
  }

  @Get()
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Query() dto: ListProjectsDto,
  ) {
    return this.projectsService.findAll(workspaceId, dto);
  }

  @Get(':projectId')
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.findOne(workspaceId, projectId);
  }

  @Patch(':projectId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(workspaceId, projectId, dto);
  }

  @Post(':projectId/archive')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  archive(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.archive(workspaceId, projectId);
  }

  @Post(':projectId/restore')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  restore(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.restore(workspaceId, projectId);
  }

  @Delete(':projectId')
  @WorkspaceRoles(WorkspaceRole.OWNER)
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.remove(workspaceId, projectId);
  }
}
