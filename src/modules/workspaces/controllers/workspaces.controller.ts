import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';

import { CreateWorkspaceDto } from '../dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto.js';

import { WorkspaceRoles } from '../decorators/workspace-roles.decorator.js';
import { WorkspaceAccessGuard } from '../guards/workspace-access.guard.js';

import { WorkspacesService } from '../services/workspaces.service.js';

import { WorkspaceRole } from '../../../../generated/prisma/client.js';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.create(user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.workspacesService.findAllForUser(user.userId);
  }

  @Get(':workspaceId')
  @UseGuards(WorkspaceAccessGuard)
  findOne(@Param('workspaceId') workspaceId: string) {
    return this.workspacesService.findOne(workspaceId);
  }

  @Patch(':workspaceId')
  @UseGuards(WorkspaceAccessGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  update(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(workspaceId, dto);
  }

  @Delete(':workspaceId')
  @UseGuards(WorkspaceAccessGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  remove(@Param('workspaceId') workspaceId: string) {
    return this.workspacesService.remove(workspaceId);
  }

  @Post(':workspaceId/invitations')
  @UseGuards(WorkspaceAccessGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  invitePlaceholder(@Param('workspaceId') workspaceId: string) {
    return this.workspacesService.invitePlaceholder(workspaceId);
  }
}
