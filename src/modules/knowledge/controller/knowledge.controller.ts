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

import { KnowledgeService } from '../service/knowledge.service.js';

import { CreateKnowledgeArticleDto } from '../dto/create-knowledge-article.dto.js';
import { UpdateKnowledgeArticleDto } from '../dto/update-knowledge-article.dto.js';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';

@Controller('workspaces/:workspaceId/knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  /**
   * --------------------------------------------------------------------------
   * Create
   * --------------------------------------------------------------------------
   */
  @Post()
  async create(
    @Param('workspaceId', new ParseUUIDPipe())
    workspaceId: string,

    @CurrentUser('userId')
    userId: string,

    @Body()
    dto: CreateKnowledgeArticleDto,
  ) {
    return this.knowledgeService.create(workspaceId, userId, dto);
  }

  /**
   * --------------------------------------------------------------------------
   * List
   * --------------------------------------------------------------------------
   */
  @Get()
  async findAll(
    @Param('workspaceId', new ParseUUIDPipe())
    workspaceId: string,

    @CurrentUser('userId')
    userId: string,
  ) {
    return this.knowledgeService.findAll(workspaceId, userId);
  }

  /**
   * --------------------------------------------------------------------------
   * Get one
   * --------------------------------------------------------------------------
   */
  @Get(':articleId')
  async findOne(
    @Param('workspaceId', new ParseUUIDPipe())
    workspaceId: string,

    @Param('articleId', new ParseUUIDPipe())
    articleId: string,

    @CurrentUser('userId')
    userId: string,
  ) {
    return this.knowledgeService.findOne(workspaceId, articleId, userId);
  }

  /**
   * --------------------------------------------------------------------------
   * Update
   * --------------------------------------------------------------------------
   */
  @Patch(':articleId')
  async update(
    @Param('workspaceId', new ParseUUIDPipe())
    workspaceId: string,

    @Param('articleId', new ParseUUIDPipe())
    articleId: string,

    @CurrentUser('userId')
    userId: string,

    @Body()
    dto: UpdateKnowledgeArticleDto,
  ) {
    return this.knowledgeService.update(workspaceId, articleId, userId, dto);
  }

  /**
   * --------------------------------------------------------------------------
   * Delete
   * --------------------------------------------------------------------------
   */
  @Delete(':articleId')
  async remove(
    @Param('workspaceId', new ParseUUIDPipe())
    workspaceId: string,

    @Param('articleId', new ParseUUIDPipe())
    articleId: string,

    @CurrentUser('userId')
    userId: string,
  ) {
    await this.knowledgeService.remove(workspaceId, articleId, userId);
  }
}
