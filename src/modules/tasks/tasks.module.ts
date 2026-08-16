import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';

import { TasksController } from './controllers/tasks.controller.js';
import { TaskAccessGuard } from './guards/task-access-guard.js';
import { TasksService } from './services/tasks.service.js';

@Module({
  imports: [PrismaModule, WorkspacesModule],
  controllers: [TasksController],
  providers: [TasksService, TaskAccessGuard],
  exports: [TasksService],
})
export class TasksModule {}
