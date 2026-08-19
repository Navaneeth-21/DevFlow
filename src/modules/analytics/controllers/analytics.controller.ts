import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AnalyticsService } from '../services/analytics.service.js';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto.js';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';

@Controller('workspaces/:workspaceId/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * --------------------------------------------------------------------------
   * Workspace Analytics
   * --------------------------------------------------------------------------
   *
   * GET
   * /api/v1/workspaces/:workspaceId/analytics
   *
   * Optional:
   * ?period=7d
   * ?period=30d
   * ?period=90d
   */
  @Get()
  async getAnalytics(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Query() query: AnalyticsQueryDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.analyticsService.getAnalytics(
      workspaceId,
      userId,
      query.period ?? '30d',
    );
  }
}
