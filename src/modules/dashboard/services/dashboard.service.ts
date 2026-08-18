import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(workspaceId: string, userId: string) {
    /*
     * Every dashboard request must belong to an authenticated workspace member.
     */
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
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    // Verify workspace exists and is not deleted

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
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Date boundaries

    const now = new Date();

    const nextSevenDays = new Date(now);
    nextSevenDays.setDate(nextSevenDays.getDate() + 7);

    //  Dashboard queries
    //  These queries are independent, so they can run in parallel.
    const [
      totalMembers,
      totalProjects,
      projectsByStatus,
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      overdueTasks,
      upcomingTasks,
      recentProjects,
      recentTasks,
      recentComments,
    ] = await Promise.all([
      /*
       * Total workspace members
       */
      this.prisma.workspaceMember.count({
        where: {
          workspaceId,
        },
      }),

      /*
       * Total active projects
       */
      this.prisma.project.count({
        where: {
          workspaceId,
          deletedAt: null,
        },
      }),

      /*
       * Projects grouped by status
       */
      this.prisma.project.groupBy({
        by: ['status'],
        where: {
          workspaceId,
          deletedAt: null,
        },
        _count: {
          _all: true,
        },
      }),

      /*
       * Total active tasks in the workspace
       */
      this.prisma.task.count({
        where: {
          deletedAt: null,
          project: {
            workspaceId,
            deletedAt: null,
          },
        },
      }),

      /*
       * Tasks grouped by status
       */
      this.prisma.task.groupBy({
        by: ['status'],
        where: {
          deletedAt: null,
          project: {
            workspaceId,
            deletedAt: null,
          },
        },
        _count: {
          _all: true,
        },
      }),

      /*
       * Tasks grouped by priority
       */
      this.prisma.task.groupBy({
        by: ['priority'],
        where: {
          deletedAt: null,
          project: {
            workspaceId,
            deletedAt: null,
          },
        },
        _count: {
          _all: true,
        },
      }),

      /*
       * Overdue tasks
       *
       * A task is overdue when:
       * - it has a due date
       * - due date has passed
       * - task isn't DONE
       * - task isn't deleted
       */
      this.prisma.task.count({
        where: {
          deletedAt: null,
          dueDate: {
            lt: now,
          },
          status: {
            not: 'DONE',
          },
          project: {
            workspaceId,
            deletedAt: null,
          },
        },
      }),

      /*
       * Tasks due within the next 7 days
       */
      this.prisma.task.count({
        where: {
          deletedAt: null,
          dueDate: {
            gte: now,
            lte: nextSevenDays,
          },
          status: {
            not: 'DONE',
          },
          project: {
            workspaceId,
            deletedAt: null,
          },
        },
      }),

      /*
       * Recently created projects
       */
      this.prisma.project.findMany({
        where: {
          workspaceId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      /*
       * Recently created/updated tasks
       */
      this.prisma.task.findMany({
        where: {
          deletedAt: null,
          project: {
            workspaceId,
            deletedAt: null,
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 10,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          progress: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,

          project: {
            select: {
              id: true,
              name: true,
            },
          },

          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      }),

      /*
       * Recent comments
       *
       * This gives the dashboard a lightweight activity feed without
       * turning Dashboard into the Analytics module.
       */
      this.prisma.comment.findMany({
        where: {
          deletedAt: null,
          task: {
            deletedAt: null,
            project: {
              workspaceId,
              deletedAt: null,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
        select: {
          id: true,
          content: true,
          createdAt: true,

          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },

          task: {
            select: {
              id: true,
              title: true,

              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Transform grouped project statuses

    const projectStatusCounts = {
      PLANNING: 0,
      ACTIVE: 0,
      ON_HOLD: 0,
      COMPLETED: 0,
      ARCHIVED: 0,
    };

    for (const item of projectsByStatus) {
      projectStatusCounts[item.status] = item._count._all;
    }

    // Transform grouped task statuses

    const taskStatusCounts = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };

    for (const item of tasksByStatus) {
      taskStatusCounts[item.status] = item._count._all;
    }

    //  Transform grouped task priorities

    const taskPriorityCounts = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    for (const item of tasksByPriority) {
      taskPriorityCounts[item.priority] = item._count._all;
    }

    // Final dashboard response
    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        slug: workspace.slug,
      },

      overview: {
        totalMembers,
        totalProjects,
        totalTasks,
        overdueTasks,
        upcomingTasks,
      },

      projects: {
        total: totalProjects,
        byStatus: projectStatusCounts,
      },

      tasks: {
        total: totalTasks,
        byStatus: taskStatusCounts,
        byPriority: taskPriorityCounts,
      },

      recentProjects,

      recentTasks,

      recentComments,

      generatedAt: new Date(),
    };
  }
}
