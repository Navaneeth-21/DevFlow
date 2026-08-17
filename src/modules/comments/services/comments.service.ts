import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service.js';

import { CreateCommentDto } from '../dto/create-comment.dto.js';
import { UpdateCommentDto } from '../dto/update-comment.dto.js';
import { ListCommentsDto } from '../dto/list-comments.dto.js';

import { WorkspaceRole } from '../../../../generated/prisma/client.js';

const commentWithAuthorSelect = {
  id: true,
  taskId: true,
  authorId: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
    },
  },
} as const;

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async validateTaskExists(taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        project: {
          workspace: {
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async create(taskId: string, authorId: string, dto: CreateCommentDto) {
    await this.validateTaskExists(taskId);

    const comment = await this.prisma.comment.create({
      data: {
        taskId,
        authorId,
        content: dto.content.trim(),
      },
      select: commentWithAuthorSelect,
    });

    return { comment };
  }

  async findAll(taskId: string, dto: ListCommentsDto) {
    await this.validateTaskExists(taskId);

    const skip = (dto.page - 1) * dto.limit;

    const [comments, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where: {
          taskId,
          deletedAt: null,
        },
        select: commentWithAuthorSelect,
        orderBy: {
          createdAt: 'asc',
        },
        skip,
        take: dto.limit,
      }),
      this.prisma.comment.count({
        where: {
          taskId,
          deletedAt: null,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / dto.limit);

    return {
      comments,
      pagination: {
        page: dto.page,
        limit: dto.limit,
        total,
        totalPages,
        hasNextPage: dto.page < totalPages,
        hasPreviousPage: dto.page > 1,
      },
    };
  }

  async findOne(taskId: string, commentId: string) {
    await this.validateTaskExists(taskId);

    const comment = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
        deletedAt: null,
      },
      select: commentWithAuthorSelect,
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return { comment };
  }

  async update(
    taskId: string,
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
  ) {
    await this.validateTaskExists(taskId);

    const comment = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
        deletedAt: null,
      },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updated = await this.prisma.comment.update({
      where: {
        id: commentId,
      },
      data: {
        content: dto.content.trim(),
      },
      select: commentWithAuthorSelect,
    });

    return { comment: updated };
  }

  async remove(
    taskId: string,
    commentId: string,
    userId: string,
    role: WorkspaceRole,
  ) {
    await this.validateTaskExists(taskId);

    const comment = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
        deletedAt: null,
      },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const isAuthor = comment.authorId === userId;
    const isWorkspaceAdmin =
      role === WorkspaceRole.ADMIN || role === WorkspaceRole.OWNER;

    if (!isAuthor && !isWorkspaceAdmin) {
      throw new ForbiddenException(
        'You do not have permission to delete this comment',
      );
    }

    await this.prisma.comment.update({
      where: {
        id: commentId,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Comment deleted successfully',
    };
  }
}
