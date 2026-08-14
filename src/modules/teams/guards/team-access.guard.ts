import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service.js';

interface TeamRequest {
  params: {
    workspaceId?: string;
    teamId?: string;
  };
}

@Injectable()
export class TeamAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TeamRequest>();

    const workspaceId = request.params.workspaceId;

    const teamId = request.params.teamId;

    if (!workspaceId || !teamId) {
      throw new NotFoundException('Workspace or team ID is required');
    }

    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        workspaceId,
      },
      select: {
        id: true,
        workspaceId: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return true;
  }
}
