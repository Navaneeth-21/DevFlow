import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';

import { ProjectsController } from './controllers/projects.controller.js';
import { ProjectsService } from './services/projects.service.js';

@Module({
  imports: [PrismaModule, WorkspacesModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
