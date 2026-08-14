import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service.js';

import { CreateTeamDto } from '../dto/create-team.dto.js';
import { UpdateTeamDto } from '../dto/update-team.dto.js';
import { AddTeamMemberDto } from '../dto/add-team-member.dto.js';
import { UpdateTeamMemberDto } from '../dto/update-team-member.dto.js';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateTeamDto) {
    const name = dto.name.trim();

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

    const existingTeam = await this.prisma.team.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingTeam) {
      throw new ConflictException(
        'A team with this name already exists in the workspace',
      );
    }

    const team = await this.prisma.team.create({
      data: {
        workspaceId,
        name,
        description: dto.description?.trim() || null,
      },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      team,
    };
  }

  async findAll(workspaceId: string) {
    const teams = await this.prisma.team.findMany({
      where: {
        workspaceId,
      },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      teams,
    };
  }

  async findOne(workspaceId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        workspaceId,
      },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return {
      team,
    };
  }

  async update(workspaceId: string, teamId: string, dto: UpdateTeamDto) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        workspaceId,
      },
      select: {
        id: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const data: {
      name?: string;
      description?: string | null;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }

    if (data.name) {
      const existingTeam = await this.prisma.team.findFirst({
        where: {
          workspaceId,
          name: data.name,
          id: {
            not: teamId,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingTeam) {
        throw new ConflictException(
          'A team with this name already exists in the workspace',
        );
      }
    }

    const updatedTeam = await this.prisma.team.update({
      where: {
        id: teamId,
      },
      data,
      select: {
        id: true,
        workspaceId: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      team: updatedTeam,
    };
  }

  async remove(workspaceId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        workspaceId,
      },
      select: {
        id: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    await this.prisma.team.delete({
      where: {
        id: teamId,
      },
    });

    return {
      message: 'Team deleted successfully',
    };
  }

  async findMembers(workspaceId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        workspaceId,
      },
      select: {
        id: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const members = await this.prisma.teamMember.findMany({
      where: {
        teamId,
      },
      select: {
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return {
      members,
    };
  }

  async addMember(workspaceId: string, teamId: string, dto: AddTeamMemberDto) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        workspaceId,
      },
      select: {
        id: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const workspaceMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: dto.userId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!workspaceMembership) {
      throw new ForbiddenException(
        'User must be a workspace member before joining a team',
      );
    }

    const existingMembership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: dto.userId,
        },
      },
      select: {
        teamId: true,
      },
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of this team');
    }

    const membership = await this.prisma.teamMember.create({
      data: {
        teamId,
        userId: dto.userId,
      },
      select: {
        teamId: true,
        userId: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      membership,
    };
  }

  async updateMemberRole(
    workspaceId: string,
    teamId: string,
    userId: string,
    dto: UpdateTeamMemberDto,
  ) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        workspaceId,
      },
      select: {
        id: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const membership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      select: {
        teamId: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Team member not found');
    }

    const updated = await this.prisma.teamMember.update({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      data: {
        role: dto.role,
      },
      select: {
        teamId: true,
        userId: true,
        role: true,
        joinedAt: true,
      },
    });

    return {
      membership: updated,
    };
  }

  async removeMember(workspaceId: string, teamId: string, userId: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        workspaceId,
      },
      select: {
        id: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const membership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      select: {
        teamId: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Team member not found');
    }

    await this.prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    return {
      message: 'Team member removed successfully',
    };
  }
}
