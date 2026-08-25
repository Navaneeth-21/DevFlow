import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service.js';

import { UpdateProfileDto } from '../dto/update-profile.dto.js';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * --------------------------------------------------------------------------
   * Get Current User
   * --------------------------------------------------------------------------
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,

        firstName: true,
        lastName: true,

        email: true,

        avatarUrl: true,

        isEmailVerified: true,
        isActive: true,

        createdAt: true,
        updatedAt: true,

        _count: {
          select: {
            workspaceMemberships: true,
            teamMemberships: true,
            createdProjects: true,
            assignedTasks: true,
            comments: true,
            createdDecisionLogs: true,
            createdKnowledgeArticles: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * --------------------------------------------------------------------------
   * Update Current User Profile
   * --------------------------------------------------------------------------
   */
  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        ...(dto.firstName !== undefined && {
          firstName: dto.firstName,
        }),

        ...(dto.lastName !== undefined && {
          lastName: dto.lastName,
        }),

        ...(dto.avatarUrl !== undefined && {
          avatarUrl: dto.avatarUrl,
        }),
      },

      select: {
        id: true,

        firstName: true,
        lastName: true,

        email: true,

        avatarUrl: true,

        isEmailVerified: true,
        isActive: true,

        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * --------------------------------------------------------------------------
   * Get Current User Workspaces
   * --------------------------------------------------------------------------
   */
  async getMyWorkspaces(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: {
        userId,

        workspace: {
          deletedAt: null,
        },
      },

      orderBy: {
        joinedAt: 'asc',
      },

      select: {
        role: true,
        joinedAt: true,

        workspace: {
          select: {
            id: true,
            name: true,
            description: true,
            slug: true,
            createdAt: true,

            _count: {
              select: {
                members: true,
                teams: true,
                projects: true,
              },
            },
          },
        },
      },
    });

    return memberships.map((membership) => ({
      ...membership.workspace,

      role: membership.role,

      joinedAt: membership.joinedAt,
    }));
  }

  /**
   * --------------------------------------------------------------------------
   * Get Current User Teams
   * --------------------------------------------------------------------------
   */
  async getMyTeams(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: {
        userId,

        team: {
          workspace: {
            deletedAt: null,
          },
        },
      },

      orderBy: {
        joinedAt: 'asc',
      },

      select: {
        role: true,
        joinedAt: true,

        team: {
          select: {
            id: true,
            name: true,
            description: true,
            workspaceId: true,
            createdAt: true,

            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },

            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
    });

    return memberships.map((membership) => ({
      ...membership.team,

      role: membership.role,

      joinedAt: membership.joinedAt,
    }));
  }

  /**
   * --------------------------------------------------------------------------
   * Update User Status
   * --------------------------------------------------------------------------
   *
   * Only OWNER / ADMIN of a workspace can manage another
   * user's active status.
   */
  async updateUserStatus(
    workspaceId: string,
    targetUserId: string,
    currentUserId: string,
    dto: UpdateUserStatusDto,
  ) {
    const currentMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: currentUserId,
        },
      },

      select: {
        role: true,
      },
    });

    if (!currentMembership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    if (
      currentMembership.role !== 'OWNER' &&
      currentMembership.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Only workspace owners and admins can manage user status',
      );
    }

    const targetMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUserId,
        },
      },

      select: {
        userId: true,
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('User is not a member of this workspace');
    }

    /*
     * Prevent an admin from deactivating themselves
     * through this endpoint.
     */
    if (targetUserId === currentUserId) {
      throw new ForbiddenException('You cannot change your own active status');
    }

    return this.prisma.user.update({
      where: {
        id: targetUserId,
      },

      data: {
        isActive: dto.isActive,
      },

      select: {
        id: true,

        firstName: true,
        lastName: true,

        email: true,

        avatarUrl: true,

        isEmailVerified: true,
        isActive: true,

        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
