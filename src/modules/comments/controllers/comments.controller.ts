import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';

import { CommentAccessGuard } from '../guards/comment-access.guard.js';

import { CreateCommentDto } from '../dto/create-comment.dto.js';
import { UpdateCommentDto } from '../dto/update-comment.dto.js';
import { ListCommentsDto } from '../dto/list-comments.dto.js';

import { CommentsService } from '../services/comments.service.js';
import { WorkspaceRole } from '../../../../generated/prisma/client.js';

interface CommentRequest extends Request {
  commentContext?: {
    taskId: string;
    workspaceId: string;
    role: WorkspaceRole;
  };
}

@Controller('tasks/:taskId/comments')
@UseGuards(JwtAuthGuard, CommentAccessGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(taskId, user.userId, dto);
  }

  @Get()
  findAll(
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Query() dto: ListCommentsDto,
  ) {
    return this.commentsService.findAll(taskId, dto);
  }

  @Get(':commentId')
  findOne(
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
  ) {
    return this.commentsService.findOne(taskId, commentId);
  }

  @Patch(':commentId')
  update(
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(taskId, commentId, user.userId, dto);
  }

  @Delete(':commentId')
  remove(
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: CommentRequest,
  ) {
    const role = req.commentContext?.role ?? WorkspaceRole.MEMBER;

    return this.commentsService.remove(taskId, commentId, user.userId, role);
  }
}
