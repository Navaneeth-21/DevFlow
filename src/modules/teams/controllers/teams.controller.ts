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

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';

import { WorkspaceAccessGuard } from '../../workspaces/guards/workspace-access.guard.js';
import { WorkspaceRoles } from '../../workspaces/decorators/workspace-roles.decorator.js';

import { WorkspaceRole } from '../../../../generated/prisma/client.js';

import { CreateTeamDto } from '../dto/create-team.dto.js';
import { UpdateTeamDto } from '../dto/update-team.dto.js';
import { AddTeamMemberDto } from '../dto/add-team-member.dto.js';
import { UpdateTeamMemberDto } from '../dto/update-team-member.dto.js';

import { TeamAccessGuard } from '../guards/team-access.guard.js';
import { TeamsService } from '../services/teams.service.js';

@Controller('workspaces/:workspaceId/teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @UseGuards(WorkspaceAccessGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamsService.create(workspaceId, dto);
  }

  @Get()
  @UseGuards(WorkspaceAccessGuard)
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.teamsService.findAll(workspaceId);
  }

  @Get(':teamId')
  @UseGuards(WorkspaceAccessGuard, TeamAccessGuard)
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.teamsService.findOne(workspaceId, teamId);
  }

  @Patch(':teamId')
  @UseGuards(WorkspaceAccessGuard, TeamAccessGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.update(workspaceId, teamId, dto);
  }

  @Delete(':teamId')
  @UseGuards(WorkspaceAccessGuard, TeamAccessGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.teamsService.remove(workspaceId, teamId);
  }

  @Get(':teamId/members')
  @UseGuards(WorkspaceAccessGuard, TeamAccessGuard)
  findMembers(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.teamsService.findMembers(workspaceId, teamId);
  }

  @Post(':teamId/members')
  @UseGuards(WorkspaceAccessGuard, TeamAccessGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  addMember(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @Body() dto: AddTeamMemberDto,
  ) {
    return this.teamsService.addMember(workspaceId, teamId, dto);
  }

  @Patch(':teamId/members/:userId')
  @UseGuards(WorkspaceAccessGuard, TeamAccessGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateTeamMemberDto,
  ) {
    return this.teamsService.updateMemberRole(workspaceId, teamId, userId, dto);
  }

  @Delete(':teamId/members/:userId')
  @UseGuards(WorkspaceAccessGuard, TeamAccessGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    return this.teamsService.removeMember(workspaceId, teamId, userId);
  }
}
