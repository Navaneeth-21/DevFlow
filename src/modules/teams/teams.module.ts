import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module.js';

import { WorkspacesModule } from '../workspaces/workspaces.module.js';

import { TeamsController } from './controllers/teams.controller.js';
import { TeamAccessGuard } from './guards/team-access.guard.js';
import { TeamsService } from './services/teams.service.js';

@Module({
  imports: [PrismaModule, WorkspacesModule],
  controllers: [TeamsController],
  providers: [TeamsService, TeamAccessGuard],
  exports: [TeamsService],
})
export class TeamsModule {}
