import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { PrismaModule } from '../../database/prisma/prisma.module.js';

import { WorkspacesController } from './controllers/workspaces.controller.js';
import { WorkspaceAccessGuard } from './guards/workspace-access.guard.js';
import { WorkspacesService } from './services/workspaces.service.js';

@Module({
  imports: [PrismaModule, PassportModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspaceAccessGuard],
  exports: [WorkspacesService, WorkspaceAccessGuard],
})
export class WorkspacesModule {}
