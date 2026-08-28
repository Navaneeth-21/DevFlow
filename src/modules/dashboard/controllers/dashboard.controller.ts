import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';

import { DashboardService } from '../services/dashboard.service.js';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { WorkspaceAccessGuard } from '../../workspaces/guards/workspace-access.guard.js';

@Controller('workspaces/:workspaceId/dashboard')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @CurrentUser() user: { userId: string; email: string },
  ) {
    return this.dashboardService.getDashboard(workspaceId, user.userId);
  }
}
