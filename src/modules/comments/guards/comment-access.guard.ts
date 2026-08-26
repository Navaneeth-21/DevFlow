import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { WorkspaceRole } from '../../../../generated/prisma/client.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface CommentRequest {
  user: {
    userId: string;
  };
  params: {
    taskId?: string;
    commentId?: string;
  };
  commentContext?: {
    taskId: string;
    workspaceId: string;
    role: WorkspaceRole;
  };
}

@Injectable()
export class CommentAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CommentRequest>();
    const taskId = request.params.taskId;
    const commentId = request.params.commentId;
    const userId = request.user.userId;

    if (!taskId) {
      throw new NotFoundException('Task ID is required');
    }

    if (!UUID_REGEX.test(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }

    if (commentId && !UUID_REGEX.test(commentId)) {
      throw new BadRequestException('Invalid comment ID');
    }

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
        project: {
          select: {
            workspaceId: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (commentId) {
      const comment = await this.prisma.comment.findFirst({
        where: {
          id: commentId,
          taskId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }
    }

    const workspaceId = task.project.workspaceId;

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this task');
    }

    request.commentContext = {
      taskId,
      workspaceId,
      role: membership.role,
    };

    return true;
  }
}
