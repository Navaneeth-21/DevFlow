import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service.js';

import { CreateKnowledgeArticleDto } from '../dto/create-knowledge-article.dto.js';
import { UpdateKnowledgeArticleDto } from '../dto/update-knowledge-article.dto.js';

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * --------------------------------------------------------------------------
   * Create Knowledge Article
   * --------------------------------------------------------------------------
   */
  async create(
    workspaceId: string,
    userId: string,
    dto: CreateKnowledgeArticleDto,
  ) {
    await this.ensureWorkspaceMember(workspaceId, userId);

    return this.prisma.knowledgeArticle.create({
      data: {
        workspaceId,
        createdById: userId,
        updatedById: userId,

        title: dto.title,
        content: dto.content,
      },

      select: {
        id: true,
        workspaceId: true,
        title: true,
        content: true,
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

        updatedBy: {
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
   * List Knowledge Articles
   * --------------------------------------------------------------------------
   */
  async findAll(workspaceId: string, userId: string) {
    await this.ensureWorkspaceMember(workspaceId, userId);

    return this.prisma.knowledgeArticle.findMany({
      where: {
        workspaceId,
      },

      orderBy: {
        updatedAt: 'desc',
      },

      select: {
        id: true,
        workspaceId: true,
        title: true,
        content: true,
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

        updatedBy: {
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
   * Get Single Knowledge Article
   * --------------------------------------------------------------------------
   */
  async findOne(workspaceId: string, articleId: string, userId: string) {
    await this.ensureWorkspaceMember(workspaceId, userId);

    const article = await this.prisma.knowledgeArticle.findFirst({
      where: {
        id: articleId,
        workspaceId,
      },

      select: {
        id: true,
        workspaceId: true,
        title: true,
        content: true,
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

        updatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Knowledge article not found');
    }

    return article;
  }

  /**
   * --------------------------------------------------------------------------
   * Update Knowledge Article
   * --------------------------------------------------------------------------
   *
   * Any workspace member can update an article.
   *
   * updatedById tracks who made the latest modification.
   */
  async update(
    workspaceId: string,
    articleId: string,
    userId: string,
    dto: UpdateKnowledgeArticleDto,
  ) {
    await this.ensureWorkspaceMember(workspaceId, userId);

    const article = await this.prisma.knowledgeArticle.findFirst({
      where: {
        id: articleId,
        workspaceId,
      },

      select: {
        id: true,
      },
    });

    if (!article) {
      throw new NotFoundException('Knowledge article not found');
    }

    return this.prisma.knowledgeArticle.update({
      where: {
        id: articleId,
      },

      data: {
        ...(dto.title !== undefined && {
          title: dto.title,
        }),

        ...(dto.content !== undefined && {
          content: dto.content,
        }),

        updatedById: userId,
      },

      select: {
        id: true,
        workspaceId: true,
        title: true,
        content: true,
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

        updatedBy: {
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
   * Delete Knowledge Article
   * --------------------------------------------------------------------------
   *
   * For the initial version, only the creator can delete it.
   */
  async remove(workspaceId: string, articleId: string, userId: string) {
    await this.ensureWorkspaceMember(workspaceId, userId);

    const article = await this.prisma.knowledgeArticle.findFirst({
      where: {
        id: articleId,
        workspaceId,
      },

      select: {
        id: true,
        createdById: true,
      },
    });

    if (!article) {
      throw new NotFoundException('Knowledge article not found');
    }

    if (article.createdById !== userId) {
      throw new ForbiddenException(
        'You are not allowed to delete this knowledge article',
      );
    }

    await this.prisma.knowledgeArticle.delete({
      where: {
        id: articleId,
      },
    });
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
