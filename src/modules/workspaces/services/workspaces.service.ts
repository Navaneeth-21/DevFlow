import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service.js';

import { CreateWorkspaceDto } from '../dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto.js';

import { WorkspaceRole } from '../../../../generated/prisma/client.js';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    const name = dto.name.trim();

    const slug = dto.slug?.trim().toLowerCase() ?? this.generateSlug(name);

    const existingWorkspace = await this.prisma.workspace.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingWorkspace) {
      throw new ConflictException('Workspace slug is already in use');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          description: dto.description?.trim() || null,
          slug,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: WorkspaceRole.OWNER,
        },
      });

      return workspace;
    });

    return {
      workspace: result,
    };
  }

  async findAllForUser(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: {
        userId,
        workspace: {
          deletedAt: null,
        },
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
            updatedAt: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    return {
      workspaces: memberships,
    };
  }

  async findOne(workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            members: true,
            teams: true,
            projects: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return {
      workspace,
    };
  }

  async update(workspaceId: string, dto: UpdateWorkspaceDto) {
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const data: {
      name?: string;
      description?: string | null;
      slug?: string;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }

    if (dto.slug !== undefined) {
      const slug = dto.slug.trim().toLowerCase();

      const existing = await this.prisma.workspace.findFirst({
        where: {
          slug,
          id: {
            not: workspaceId,
          },
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        throw new ConflictException('Workspace slug is already in use');
      }

      data.slug = slug;
    }

    const updated = await this.prisma.workspace.update({
      where: {
        id: workspaceId,
      },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      workspace: updated,
    };
  }

  async remove(workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    await this.prisma.workspace.update({
      where: {
        id: workspaceId,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Workspace deleted successfully',
    };
  }

  async invitePlaceholder(workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return {
      message: 'Workspace invitations will be implemented in a later phase',
      workspaceId,
    };
  }

  private generateSlug(name: string): string {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || `workspace-${Date.now()}`;
  }
}
