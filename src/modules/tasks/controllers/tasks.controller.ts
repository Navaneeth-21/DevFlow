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

import { TaskAccessGuard } from '../guards/task-access-guard.js';

import { CreateTaskDto } from '../dto/create-task.dto.js';
import { UpdateTaskDto } from '../dto/update-task.dto.js';
import { TaskQueryDto } from '../dto/task-query.dto.js';
import { CreateTaskDependencyDto } from '../dto/create-task-dependency.dto.js';

import { TasksService } from '../services/tasks.service.js';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('workspaces/:workspaceId/projects/:projectId/tasks')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(
      workspaceId,
      projectId,
      request.user.userId,
      dto,
    );
  }

  @Get()
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Query() query: TaskQueryDto,
  ) {
    return this.tasksService.findAll(workspaceId, projectId, query);
  }

  @Get(':taskId')
  @UseGuards(TaskAccessGuard)
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.findOne(workspaceId, projectId, taskId);
  }

  @Patch(':taskId')
  @UseGuards(TaskAccessGuard)
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(workspaceId, projectId, taskId, dto);
  }

  @Delete(':taskId')
  @UseGuards(TaskAccessGuard)
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.remove(workspaceId, projectId, taskId);
  }

  @Post(':taskId/dependencies')
  @UseGuards(TaskAccessGuard)
  addDependency(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateTaskDependencyDto,
  ) {
    return this.tasksService.addDependency(workspaceId, projectId, taskId, dto);
  }

  @Get(':taskId/dependencies')
  @UseGuards(TaskAccessGuard)
  getDependencies(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.getDependencies(workspaceId, projectId, taskId);
  }

  @Delete(':taskId/dependencies/:predecessorId')
  @UseGuards(TaskAccessGuard)
  removeDependency(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('predecessorId')
    predecessorId: string,
  ) {
    return this.tasksService.removeDependency(
      workspaceId,
      projectId,
      predecessorId,
      taskId,
    );
  }
}
