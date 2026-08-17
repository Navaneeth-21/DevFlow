import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { TasksModule } from '../tasks/tasks.module.js';

import { CommentsController } from './controllers/comments.controller.js';
import { CommentAccessGuard } from './guards/comment-access.guard.js';
import { CommentsService } from './services/comments.service.js';

@Module({
  imports: [PrismaModule, WorkspacesModule, TasksModule],
  controllers: [CommentsController],
  providers: [CommentsService, CommentAccessGuard],
  exports: [CommentsService],
})
export class CommentsModule {}
