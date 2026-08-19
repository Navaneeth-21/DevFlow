import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service.js';

type AnalyticsPeriod = '7d' | '30d' | '90d';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(
    workspaceId: string,
    userId: string,
    period: AnalyticsPeriod,
  ) {
    /*
     * --------------------------------------------------------------------------
     * 1. Verify workspace membership
     * --------------------------------------------------------------------------
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

    /*
     * --------------------------------------------------------------------------
     * 2. Verify workspace
     * --------------------------------------------------------------------------
     */

    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        deletedAt: null,
      },

      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    /*
     * --------------------------------------------------------------------------
     * 3. Calculate analytics period
     * --------------------------------------------------------------------------
     */

    const now = new Date();

    const periodDays = this.getPeriodDays(period);

    const periodStart = new Date(now);

    periodStart.setDate(periodStart.getDate() - periodDays);

    /*
     * --------------------------------------------------------------------------
     * 4. Next 7 days
     * --------------------------------------------------------------------------
     */

    const nextSevenDays = new Date(now);

    nextSevenDays.setDate(nextSevenDays.getDate() + 7);

    /*
     * --------------------------------------------------------------------------
     * 5. Run independent database queries in parallel
     * --------------------------------------------------------------------------
     */

    const [
      totalMembers,

      totalProjects,

      activeProjects,

      totalTasks,

      completedTasks,

      overdueTasks,

      upcomingTasks,

      totalComments,

      tasksCreatedInPeriod,

      commentsCreatedInPeriod,

      projectsByStatus,

      tasksByStatus,

      tasksByPriority,

      projectTaskData,

      memberTaskData,

      tasksCreatedTrend,

      taskActivityTrendRaw,

      commentsTrend,

      recentComments,
    ] = await Promise.all([
      /*
       * Members
       */
      this.prisma.workspaceMember.count({
        where: {
          workspaceId,
        },
      }),

      /*
       * Total projects
       */
      this.prisma.project.count({
        where: {
          workspaceId,
          deletedAt: null,
        },
      }),

      /*
       * Active projects
       */
      this.prisma.project.count({
        where: {
          workspaceId,
          deletedAt: null,
          status: 'ACTIVE',
        },
      }),

      /*
       * Total tasks
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
       * Completed tasks
       */
      this.prisma.task.count({
        where: {
          deletedAt: null,

          status: 'DONE',

          project: {
            workspaceId,
            deletedAt: null,
          },
        },
      }),

      /*
       * Overdue tasks
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
       * Upcoming tasks
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
       * Total comments
       */
      this.prisma.comment.count({
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
      }),

      /*
       * Tasks created during selected period
       */
      this.prisma.task.count({
        where: {
          deletedAt: null,

          createdAt: {
            gte: periodStart,
            lte: now,
          },

          project: {
            workspaceId,
            deletedAt: null,
          },
        },
      }),

      /*
       * Comments created during selected period
       */
      this.prisma.comment.count({
        where: {
          deletedAt: null,

          createdAt: {
            gte: periodStart,
            lte: now,
          },

          task: {
            deletedAt: null,

            project: {
              workspaceId,
              deletedAt: null,
            },
          },
        },
      }),

      /*
       * Project status distribution
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
       * Task status distribution
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
       * Task priority distribution
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
       * Project-level task data
       */
      this.prisma.project.findMany({
        where: {
          workspaceId,
          deletedAt: null,
        },

        select: {
          id: true,
          name: true,
          status: true,

          tasks: {
            where: {
              deletedAt: null,
            },

            select: {
              status: true,
              progress: true,
            },
          },
        },

        orderBy: {
          updatedAt: 'desc',
        },
      }),

      /*
       * Member workload
       */
      this.prisma.user.findMany({
        where: {
          isActive: true,

          workspaceMemberships: {
            some: {
              workspaceId,
            },
          },
        },

        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,

          assignedTasks: {
            where: {
              deletedAt: null,

              project: {
                workspaceId,
                deletedAt: null,
              },
            },

            select: {
              id: true,
              status: true,
              dueDate: true,
            },
          },
        },
      }),

      /*
       * Tasks created by date
       */
      this.prisma.task.findMany({
        where: {
          deletedAt: null,

          createdAt: {
            gte: periodStart,
            lte: now,
          },

          project: {
            workspaceId,
            deletedAt: null,
          },
        },

        select: {
          createdAt: true,
        },

        orderBy: {
          createdAt: 'asc',
        },
      }),

      /*
       * Task activity by updatedAt
       */
      this.prisma.task.findMany({
        where: {
          deletedAt: null,

          updatedAt: {
            gte: periodStart,
            lte: now,
          },

          project: {
            workspaceId,
            deletedAt: null,
          },
        },

        select: {
          updatedAt: true,
        },

        orderBy: {
          updatedAt: 'asc',
        },
      }),

      /*
       * Comments by date
       */
      this.prisma.comment.findMany({
        where: {
          deletedAt: null,

          createdAt: {
            gte: periodStart,
            lte: now,
          },

          task: {
            deletedAt: null,

            project: {
              workspaceId,
              deletedAt: null,
            },
          },
        },

        select: {
          createdAt: true,
        },

        orderBy: {
          createdAt: 'asc',
        },
      }),

      /*
       * Recent comments
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

    /*
     * --------------------------------------------------------------------------
     * 6. Project status counts
     * --------------------------------------------------------------------------
     */

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

    /*
     * --------------------------------------------------------------------------
     * 7. Task status counts
     * --------------------------------------------------------------------------
     */

    const taskStatusCounts = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };

    for (const item of tasksByStatus) {
      taskStatusCounts[item.status] = item._count._all;
    }

    /*
     * --------------------------------------------------------------------------
     * 8. Task priority counts
     * --------------------------------------------------------------------------
     */

    const taskPriorityCounts = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    for (const item of tasksByPriority) {
      taskPriorityCounts[item.priority] = item._count._all;
    }

    /*
     * --------------------------------------------------------------------------
     * 9. Project analytics
     * --------------------------------------------------------------------------
     */

    const projectAnalytics = projectTaskData.map((project) => {
      const total = project.tasks.length;

      const completed = project.tasks.filter(
        (task) => task.status === 'DONE',
      ).length;

      const progress =
        total === 0
          ? 0
          : Number(
              (
                project.tasks.reduce((sum, task) => sum + task.progress, 0) /
                total
              ).toFixed(2),
            );

      const completionRate =
        total === 0 ? 0 : Number(((completed / total) * 100).toFixed(2));

      return {
        id: project.id,
        name: project.name,
        status: project.status,

        totalTasks: total,

        completedTasks: completed,

        pendingTasks: total - completed,

        progress,

        completionRate,
      };
    });

    /*
     * --------------------------------------------------------------------------
     * 10. Sort most active projects
     * --------------------------------------------------------------------------
     */

    const topProjects = [...projectAnalytics]
      .sort((a, b) => b.totalTasks - a.totalTasks)
      .slice(0, 5);

    /*
     * --------------------------------------------------------------------------
     * 11. Member workload analytics
     * --------------------------------------------------------------------------
     */

    const memberWorkload = memberTaskData.map((member) => {
      const total = member.assignedTasks.length;

      const completed = member.assignedTasks.filter(
        (task) => task.status === 'DONE',
      ).length;

      const pending = total - completed;

      const overdue = member.assignedTasks.filter(
        (task) =>
          task.dueDate !== null && task.dueDate < now && task.status !== 'DONE',
      ).length;

      const completionRate =
        total === 0 ? 0 : Number(((completed / total) * 100).toFixed(2));

      return {
        user: {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          avatarUrl: member.avatarUrl,
        },

        totalTasks: total,

        completedTasks: completed,

        pendingTasks: pending,

        overdueTasks: overdue,

        completionRate,
      };
    });

    /*
     * --------------------------------------------------------------------------
     * 12. Generate daily trends
     * --------------------------------------------------------------------------
     */

    const taskCreationTrend = this.buildDailyTrend(
      periodStart,
      now,
      tasksCreatedTrend.map((task) => task.createdAt),
    );

    const taskActivityTrend = this.buildDailyTrend(
      periodStart,
      now,
      taskActivityTrendRaw.map((task) => task.updatedAt),
    );

    const commentsTrendData = this.buildDailyTrend(
      periodStart,
      now,
      commentsTrend.map((comment) => comment.createdAt),
    );

    /*
     * --------------------------------------------------------------------------
     * 13. Completion rate
     * --------------------------------------------------------------------------
     */

    const completionRate =
      totalTasks === 0
        ? 0
        : Number(((completedTasks / totalTasks) * 100).toFixed(2));

    /*
     * --------------------------------------------------------------------------
     * 14. Overdue rate
     * --------------------------------------------------------------------------
     */

    const overdueRate =
      totalTasks === 0
        ? 0
        : Number(((overdueTasks / totalTasks) * 100).toFixed(2));

    /*
     * --------------------------------------------------------------------------
     * 15. Final response
     * --------------------------------------------------------------------------
     */

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      },

      period: {
        value: period,
        start: periodStart,
        end: now,
      },

      overview: {
        totalMembers,

        totalProjects,

        activeProjects,

        totalTasks,

        completedTasks,

        completionRate,

        overdueTasks,

        overdueRate,

        upcomingTasks,

        totalComments,

        tasksCreatedInPeriod,

        commentsCreatedInPeriod,
      },

      projects: {
        byStatus: projectStatusCounts,

        analytics: projectAnalytics,

        topProjects,
      },

      tasks: {
        byStatus: taskStatusCounts,

        byPriority: taskPriorityCounts,

        trends: {
          created: taskCreationTrend,

          activity: taskActivityTrend,
        },
      },

      workload: {
        members: memberWorkload,
      },

      activity: {
        comments: commentsTrendData,

        recentComments,
      },

      generatedAt: new Date(),
    };
  }

  /*
   * --------------------------------------------------------------------------
   * Period helper
   * --------------------------------------------------------------------------
   */

  private getPeriodDays(period: AnalyticsPeriod): number {
    switch (period) {
      case '7d':
        return 7;

      case '90d':
        return 90;

      case '30d':
      default:
        return 30;
    }
  }

  /*
   * --------------------------------------------------------------------------
   * Daily trend helper
   * --------------------------------------------------------------------------
   */

  private buildDailyTrend(startDate: Date, endDate: Date, dates: Date[]) {
    const counts = new Map<string, number>();

    const current = new Date(startDate);

    while (current <= endDate) {
      const key = this.formatDate(current);

      counts.set(key, 0);

      current.setDate(current.getDate() + 1);
    }

    for (const date of dates) {
      const key = this.formatDate(date);

      if (counts.has(key)) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }

  /*
   * --------------------------------------------------------------------------
   * Date formatting
   * --------------------------------------------------------------------------
   */

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
