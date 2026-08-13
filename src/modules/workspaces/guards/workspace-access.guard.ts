import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { WorkspaceRole } from '../../../../generated/prisma/client.js';

import { WORKSPACE_ROLES_KEY } from '../decorators/workspace-roles.decorator.js';

import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';

interface WorkspaceRequest {
  user: AuthenticatedUser;
  params: {
    workspaceId?: string;
  };
  workspaceMembership?: {
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
  };
}

@Injectable()
export class WorkspaceAccessGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      WORKSPACE_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<WorkspaceRequest>();

    const workspaceId = request.params.workspaceId;
    const userId = request.user.userId;

    if (!workspaceId) {
      throw new NotFoundException('Workspace ID is required');
    }

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
        role: true,
        workspace: {
          select: {
            deletedAt: true,
          },
        },
      },
    });

    if (!membership || membership.workspace.deletedAt) {
      throw new NotFoundException('Workspace not found');
    }

    request.workspaceMembership = {
      workspaceId: membership.workspaceId,
      userId: membership.userId,
      role: membership.role,
    };

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
