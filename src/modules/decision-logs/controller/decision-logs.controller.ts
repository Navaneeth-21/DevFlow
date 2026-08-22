import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { DecisionLogsService } from '../services/decision-logs.service.js';

import { CreateDecisionLogDto } from '../dto/create-decision-log.dto.js';
import { UpdateDecisionLogDto } from '../dto/update-decision-log.dto.js';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';

@Controller('workspaces/:workspaceId/decisions')
@UseGuards(JwtAuthGuard)
export class DecisionLogsController {
  constructor(private readonly decisionLogsService: DecisionLogsService) {}

  /**
   * --------------------------------------------------------------------------
   * Create Decision Log
   * --------------------------------------------------------------------------
   *
   * POST
   * /api/v1/workspaces/:workspaceId/decisions
   */
  @Post()
  async create(
    @Param('workspaceId', new ParseUUIDPipe())
    workspaceId: string,

    @CurrentUser('userId')
    userId: string,

    @Body()
    dto: CreateDecisionLogDto,
  ) {
    return this.decisionLogsService.create(workspaceId, userId, dto);
  }

  /**
   * --------------------------------------------------------------------------
   * Get all Decision Logs
   * --------------------------------------------------------------------------
   *
   * GET
   * /api/v1/workspaces/:workspaceId/decisions
   */
  @Get()
  async findAll(
    @Param('workspaceId', new ParseUUIDPipe())
    workspaceId: string,

    @CurrentUser('userId')
    userId: string,
  ) {
    return this.decisionLogsService.findAll(workspaceId, userId);
  }

  /**
   * --------------------------------------------------------------------------
   * Get single Decision Log
   * --------------------------------------------------------------------------
   *
   * GET
   * /api/v1/workspaces/:workspaceId/decisions/:decisionId
   */
  @Get(':decisionId')
  async findOne(
    @Param('workspaceId', new ParseUUIDPipe())
    workspaceId: string,

    @Param('decisionId', new ParseUUIDPipe())
    decisionId: string,

    @CurrentUser('userId')
    userId: string,
  ) {
    return this.decisionLogsService.findOne(workspaceId, decisionId, userId);
  }

  /**
   * --------------------------------------------------------------------------
   * Update Decision Log
   * --------------------------------------------------------------------------
   *
   * PATCH
   * /api/v1/workspaces/:workspaceId/decisions/:decisionId
   */
  @Patch(':decisionId')
  async update(
    @Param('workspaceId', new ParseUUIDPipe())
    workspaceId: string,

    @Param('decisionId', new ParseUUIDPipe())
    decisionId: string,

    @CurrentUser('userId')
    userId: string,

    @Body()
    dto: UpdateDecisionLogDto,
  ) {
    return this.decisionLogsService.update(
      workspaceId,
      decisionId,
      userId,
      dto,
    );
  }

  /**
   * --------------------------------------------------------------------------
   * Delete Decision Log
   * --------------------------------------------------------------------------
   *
   * DELETE
   * /api/v1/workspaces/:workspaceId/decisions/:decisionId
   */
  @Delete(':decisionId')
  async remove(
    @Param('workspaceId', new ParseUUIDPipe())
    workspaceId: string,

    @Param('decisionId', new ParseUUIDPipe())
    decisionId: string,

    @CurrentUser('userId')
    userId: string,
  ) {
    await this.decisionLogsService.remove(workspaceId, decisionId, userId);
  }
}
