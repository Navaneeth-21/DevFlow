import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from '../service/users.service.js';

import { UpdateProfileDto } from '../dto/update-profile.dto.js';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto.js';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * --------------------------------------------------------------------------
   * Current User Profile
   * --------------------------------------------------------------------------
   *
   * GET /api/v1/users/me
   */
  @Get('me')
  async getMe(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.usersService.getMe(user.userId);
  }

  /**
   * --------------------------------------------------------------------------
   * Update Current User Profile
   * --------------------------------------------------------------------------
   *
   * PATCH /api/v1/users/me
   */
  @Patch('me')
  async updateMe(
    @CurrentUser()
    user: AuthenticatedUser,

    @Body()
    dto: UpdateProfileDto,
  ) {
    return this.usersService.updateMe(user.userId, dto);
  }

  /**
   * --------------------------------------------------------------------------
   * Current User Workspaces
   * --------------------------------------------------------------------------
   *
   * GET /api/v1/users/me/workspaces
   */
  @Get('me/workspaces')
  async getMyWorkspaces(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.usersService.getMyWorkspaces(user.userId);
  }

  /**
   * --------------------------------------------------------------------------
   * Current User Teams
   * --------------------------------------------------------------------------
   *
   * GET /api/v1/users/me/teams
   */
  @Get('me/teams')
  async getMyTeams(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.usersService.getMyTeams(user.userId);
  }

  /**
   * --------------------------------------------------------------------------
   * Update User Status
   * --------------------------------------------------------------------------
   *
   * PATCH
   * /api/v1/workspaces/:workspaceId/users/:userId/status
   */
  @Patch('workspaces/:workspaceId/users/:userId/status')
  async updateUserStatus(
    @Param('workspaceId', new ParseUUIDPipe())
    workspaceId: string,

    @Param('userId', new ParseUUIDPipe())
    targetUserId: string,

    @CurrentUser()
    user: AuthenticatedUser,

    @Body()
    dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(
      workspaceId,
      targetUserId,
      user.userId,
      dto,
    );
  }
}
