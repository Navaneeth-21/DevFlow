import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service.js';

import { CreateProjectDto } from '../dto/create-project.dto.js';
import { UpdateProjectDto } from '../dto/update-project.dto.js';
import { ListProjectsDto } from '../dto/list-projects.dto.js';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDate(value?: string | null): Date | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    return new Date(value);
  }

  private validateDateRange(
    startDate?: string | null,
    endDate?: string | null,
  ): void {
    if (!startDate || !endDate) {
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      throw new ConflictException(
        'Project start date cannot be after the end date',
      );
    }
  }

  async create(
    workspaceId: string,
    createdById: string,
    dto: CreateProjectDto,
  ) {
    const name = dto.name.trim();

    this.validateDateRange(dto.startDate, dto.endDate);

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

    const existingProject = await this.prisma.project.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name,
        },
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (existingProject && existingProject.deletedAt === null) {
      throw new ConflictException(
        'A project with this name already exists in the workspace',
      );
    }

    const project = await this.prisma.project.create({
      data: {
        workspaceId,
        createdById,
        name,
        description: dto.description?.trim() || null,
        status: dto.status,
        startDate: this.parseDate(dto.startDate),
        endDate: this.parseDate(dto.endDate),
      },
      select: {
        id: true,
        workspaceId: true,
        createdById: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        archivedAt: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      project,
    };
  }

  async findAll(workspaceId: string, dto: ListProjectsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const skip = (page - 1) * limit;

    const includeArchived = dto.includeArchived === 'true';

    const where = {
      workspaceId,
      deletedAt: null,
      ...(dto.status
        ? {
            status: dto.status,
          }
        : {}),
      ...(includeArchived
        ? {}
        : {
            archivedAt: null,
          }),
    };

    const [projects, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          workspaceId: true,
          createdById: true,
          name: true,
          description: true,
          status: true,
          startDate: true,
          endDate: true,
          archivedAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      }),

      this.prisma.project.count({
        where,
      }),
    ]);

    return {
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(workspaceId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        workspaceId: true,
        createdById: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return {
      project,
    };
  }

  async update(workspaceId: string, projectId: string, dto: UpdateProjectDto) {
    this.validateDateRange(dto.startDate, dto.endDate);

    const existingProject = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!existingProject) {
      throw new NotFoundException('Project not found');
    }

    const startDate =
      dto.startDate !== undefined
        ? this.parseDate(dto.startDate)
        : existingProject.startDate;

    const endDate =
      dto.endDate !== undefined
        ? this.parseDate(dto.endDate)
        : existingProject.endDate;

    if (startDate && endDate && startDate > endDate) {
      throw new ConflictException(
        'Project start date cannot be after the end date',
      );
    }

    const data = {
      ...(dto.name !== undefined
        ? {
            name: dto.name.trim(),
          }
        : {}),

      ...(dto.description !== undefined
        ? {
            description: dto.description?.trim() || null,
          }
        : {}),

      ...(dto.status !== undefined
        ? {
            status: dto.status,
          }
        : {}),

      ...(dto.startDate !== undefined
        ? {
            startDate: this.parseDate(dto.startDate),
          }
        : {}),

      ...(dto.endDate !== undefined
        ? {
            endDate: this.parseDate(dto.endDate),
          }
        : {}),
    };

    if (dto.name !== undefined) {
      const duplicate = await this.prisma.project.findFirst({
        where: {
          workspaceId,
          name: dto.name.trim(),
          id: {
            not: projectId,
          },
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'A project with this name already exists in the workspace',
        );
      }
    }

    const project = await this.prisma.project.update({
      where: {
        id: projectId,
      },
      data,
      select: {
        id: true,
        workspaceId: true,
        createdById: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        archivedAt: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      project,
    };
  }

  async archive(workspaceId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        archivedAt: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.archivedAt) {
      throw new ConflictException('Project is already archived');
    }

    const archivedProject = await this.prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        archivedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        archivedAt: true,
      },
    });

    return {
      project: archivedProject,
    };
  }

  async restore(workspaceId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        archivedAt: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.archivedAt) {
      throw new ConflictException('Project is not archived');
    }

    const restoredProject = await this.prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        archivedAt: null,
      },
      select: {
        id: true,
        name: true,
        archivedAt: true,
      },
    });

    return {
      project: restoredProject,
    };
  }

  async remove(workspaceId: string, projectId: string) {
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

    await this.prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Project deleted successfully',
    };
  }
}
