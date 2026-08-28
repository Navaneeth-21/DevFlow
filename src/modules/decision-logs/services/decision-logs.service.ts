import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service.js';

import { CreateDecisionLogDto } from '../dto/create-decision-log.dto.js';
import { UpdateDecisionLogDto } from '../dto/update-decision-log.dto.js';

@Injectable()
export class DecisionLogsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * --------------------------------------------------------------------------
   * Create Decision Log
   * --------------------------------------------------------------------------
   */
  async create(workspaceId: string, userId: string, dto: CreateDecisionLogDto) {
    await this.ensureWorkspaceMember(workspaceId, userId);

    const decisionLog = await this.prisma.decisionLog.create({
      data: {
        workspaceId,
        createdById: userId,
        title: dto.title,
        description: dto.description,
      },

      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,

        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return decisionLog;
  }

  /**
   * --------------------------------------------------------------------------
   * Get all Decision Logs for workspace
   * --------------------------------------------------------------------------
   */
  async findAll(workspaceId: string, userId: string) {
    await this.ensureWorkspaceMember(workspaceId, userId);

    return this.prisma.decisionLog.findMany({
      where: {
        workspaceId,
      },

      orderBy: {
        createdAt: 'desc',
      },

      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,

        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * --------------------------------------------------------------------------
   * Get single Decision Log
   * --------------------------------------------------------------------------
   */
  async findOne(workspaceId: string, decisionId: string, userId: string) {
    await this.ensureWorkspaceMember(workspaceId, userId);

    const decisionLog = await this.prisma.decisionLog.findFirst({
      where: {
        id: decisionId,
        workspaceId,
      },

      select: {
        id: true,
        workspaceId: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,

        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!decisionLog) {
      throw new NotFoundException('Decision log not found');
    }

    return decisionLog;
  }

  /**
   * --------------------------------------------------------------------------
   * Update Decision Log
   * --------------------------------------------------------------------------
   *
   * Only the creator can update their decision log.
   */
  async update(
    workspaceId: string,
    decisionId: string,
    userId: string,
    dto: UpdateDecisionLogDto,
  ) {
    await this.ensureWorkspaceMember(workspaceId, userId);

    const decisionLog = await this.prisma.decisionLog.findFirst({
      where: {
        id: decisionId,
        workspaceId,
      },

      select: {
        id: true,
        createdById: true,
      },
    });

    if (!decisionLog) {
      throw new NotFoundException('Decision log not found');
    }

    if (decisionLog.createdById !== userId) {
      throw new ForbiddenException(
        'You are not allowed to update this decision log',
      );
    }

    return this.prisma.decisionLog.update({
      where: {
        id: decisionId,
      },

      data: {
        ...(dto.title !== undefined && {
          title: dto.title,
        }),

        ...(dto.description !== undefined && {
          description: dto.description,
        }),
      },

      select: {
        id: true,
        workspaceId: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,

        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * --------------------------------------------------------------------------
   * Delete Decision Log
   * --------------------------------------------------------------------------
   *
   * Only the creator can delete their decision log.
   */
  async remove(workspaceId: string, decisionId: string, userId: string) {
    await this.ensureWorkspaceMember(workspaceId, userId);

    const decisionLog = await this.prisma.decisionLog.findFirst({
      where: {
        id: decisionId,
        workspaceId,
      },

      select: {
        id: true,
        createdById: true,
      },
    });

    if (!decisionLog) {
      throw new NotFoundException('Decision log not found');
    }

    if (decisionLog.createdById !== userId) {
      throw new ForbiddenException(
        'You are not allowed to delete this decision log',
      );
    }

    await this.prisma.decisionLog.delete({
      where: {
        id: decisionId,
      },
    });

    return;
  }

  /**
   * --------------------------------------------------------------------------
   * Workspace Membership
   * --------------------------------------------------------------------------
   */
  private async ensureWorkspaceMember(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },

      select: {
        workspaceId: true,
        userId: true,
        workspace: {
          select: {
            deletedAt: true,
          },
        },
      },
    });

    if (!membership || membership.workspace.deletedAt) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
  }
}
