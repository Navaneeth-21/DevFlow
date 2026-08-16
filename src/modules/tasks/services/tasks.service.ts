import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service.js';

import { CreateTaskDto } from '../dto/create-task.dto.js';
import { UpdateTaskDto } from '../dto/update-task.dto.js';
import { SortOrder, TaskQueryDto } from '../dto/task-query.dto.js';
import { CreateTaskDependencyDto } from '../dto/create-task-dependency.dto.js';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    workspaceId: string,
    projectId: string,
    userId: string,
    dto: CreateTaskDto,
  ) {
    await this.validateProject(workspaceId, projectId);

    if (dto.assigneeId) {
      await this.validateWorkspaceMember(workspaceId, dto.assigneeId);
    }

    const task = await this.prisma.task.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: dto.status,
        priority: dto.priority,
        estimatedHours: dto.estimatedHours,
        progress: dto.progress,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        project: {
          connect: {
            id: projectId,
          },
        },
        createdBy: {
          connect: {
            id: userId,
          },
        },
        assignee: dto.assigneeId
          ? {
              connect: {
                id: dto.assigneeId,
              },
            }
          : undefined,
      },
      select: this.taskSelect,
    });

    return {
      task,
    };
  }

  async findAll(workspaceId: string, projectId: string, query: TaskQueryDto) {
    await this.validateProject(workspaceId, projectId);

    const {
      page,
      limit,
      status,
      priority,
      assigneeId,
      search,
      sortBy,
      sortOrder,
    } = query;

    const skip = (page - 1) * limit;

    const where = {
      projectId,
      deletedAt: null,
      ...(status && { status }),
      ...(priority && { priority }),
      ...(assigneeId && { assigneeId }),
      ...(search && {
        OR: [
          {
            title: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
        ],
      }),
    };

    const orderBy = {
      [sortBy]: sortOrder,
    } as Record<string, SortOrder>;

    const [tasks, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: this.taskSelect,
      }),

      this.prisma.task.count({
        where,
      }),
    ]);

    return {
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(workspaceId: string, projectId: string, taskId: string) {
    await this.validateProject(workspaceId, projectId);

    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
        deletedAt: null,
      },
      select: this.taskSelect,
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return {
      task,
    };
  }

  async update(
    workspaceId: string,
    projectId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ) {
    await this.validateProject(workspaceId, projectId);

    const existingTask = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    if (dto.assigneeId) {
      await this.validateWorkspaceMember(workspaceId, dto.assigneeId);
    }

    const data = {
      ...(dto.title !== undefined && {
        title: dto.title.trim(),
      }),

      ...(dto.description !== undefined && {
        description: dto.description?.trim() || null,
      }),

      ...(dto.status !== undefined && {
        status: dto.status,
      }),

      ...(dto.priority !== undefined && {
        priority: dto.priority,
      }),

      ...(dto.estimatedHours !== undefined && {
        estimatedHours: dto.estimatedHours,
      }),

      ...(dto.progress !== undefined && {
        progress: dto.progress,
      }),

      ...(dto.dueDate !== undefined && {
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      }),

      ...(dto.assigneeId !== undefined && {
        assigneeId: dto.assigneeId,
      }),
    };

    const task = await this.prisma.task.update({
      where: {
        id: taskId,
      },
      data,
      select: this.taskSelect,
    });

    return {
      task,
    };
  }

  async remove(workspaceId: string, projectId: string, taskId: string) {
    await this.validateProject(workspaceId, projectId);

    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Task deleted successfully',
    };
  }

  async addDependency(
    workspaceId: string,
    projectId: string,
    successorId: string,
    dto: CreateTaskDependencyDto,
  ) {
    await this.validateProject(workspaceId, projectId);

    if (dto.predecessorId === successorId) {
      throw new ConflictException('A task cannot depend on itself');
    }

    const tasks = await this.prisma.task.findMany({
      where: {
        id: {
          in: [dto.predecessorId, successorId],
        },
        projectId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (tasks.length !== 2) {
      throw new NotFoundException('Both tasks must belong to the same project');
    }

    const reverseDependency = await this.prisma.taskDependency.findUnique({
      where: {
        predecessorId_successorId: {
          predecessorId: successorId,
          successorId: dto.predecessorId,
        },
      },
    });

    if (reverseDependency) {
      throw new ConflictException(
        'This dependency would create a circular relationship',
      );
    }

    const existingDependency = await this.prisma.taskDependency.findUnique({
      where: {
        predecessorId_successorId: {
          predecessorId: dto.predecessorId,
          successorId,
        },
      },
    });

    if (existingDependency) {
      throw new ConflictException('Dependency already exists');
    }

    const dependency = await this.prisma.taskDependency.create({
      data: {
        predecessorId: dto.predecessorId,
        successorId,
      },
      select: {
        predecessorId: true,
        successorId: true,
        createdAt: true,
      },
    });

    return {
      dependency,
    };
  }

  async removeDependency(
    workspaceId: string,
    projectId: string,
    predecessorId: string,
    successorId: string,
  ) {
    await this.validateProject(workspaceId, projectId);

    const dependency = await this.prisma.taskDependency.findUnique({
      where: {
        predecessorId_successorId: {
          predecessorId,
          successorId,
        },
      },
    });

    if (!dependency) {
      throw new NotFoundException('Dependency not found');
    }

    await this.prisma.taskDependency.delete({
      where: {
        predecessorId_successorId: {
          predecessorId,
          successorId,
        },
      },
    });

    return {
      message: 'Task dependency removed successfully',
    };
  }

  async getDependencies(
    workspaceId: string,
    projectId: string,
    taskId: string,
  ) {
    await this.validateProject(workspaceId, projectId);

    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const [predecessors, successors] = await this.prisma.$transaction([
      this.prisma.taskDependency.findMany({
        where: {
          successorId: taskId,
        },
        select: {
          createdAt: true,
          predecessor: {
            select: this.dependencyTaskSelect,
          },
        },
      }),

      this.prisma.taskDependency.findMany({
        where: {
          predecessorId: taskId,
        },
        select: {
          createdAt: true,
          successor: {
            select: this.dependencyTaskSelect,
          },
        },
      }),
    ]);

    return {
      predecessors,
      successors,
    };
  }

  private async validateProject(workspaceId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private async validateWorkspaceMember(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Assignee must belong to the workspace');
    }
  }

  private readonly taskSelect = {
    id: true,
    projectId: true,
    title: true,
    description: true,
    status: true,
    priority: true,
    estimatedHours: true,
    progress: true,
    dueDate: true,
    createdAt: true,
    updatedAt: true,
    assignee: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
      },
    },
    createdBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
      },
    },
  };

  private readonly dependencyTaskSelect = {
    id: true,
    title: true,
    status: true,
    priority: true,
    progress: true,
  };
}
