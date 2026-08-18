import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';

import { DashboardController } from './controllers/dashboard.controller.js';
import { DashboardService } from './services/dashboard.service.js';

@Module({
  imports: [PrismaModule, WorkspacesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
