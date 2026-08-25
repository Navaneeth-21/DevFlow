import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';

import { PrismaModule } from './database/prisma/prisma.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { WorkspacesModule } from './modules/workspaces/workspaces.module.js';
import { TeamsModule } from './modules/teams/teams.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { CommentsModule } from './modules/comments/comments.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { DecisionLogsModule } from './modules/decision-logs/decision-logs.module.js';
import { KnowledgeModule } from './modules/knowledge/knowledge.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: '.env',

      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),

        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .required(),

        API_PREFIX: Joi.string().required(),

        API_VERSION: Joi.string().required(),

        FRONTEND_URL: Joi.string().required(),

        DATABASE_URL: Joi.string().required(),

        JWT_ACCESS_SECRET: Joi.string().min(32).required(),

        JWT_ACCESS_EXPIRES_IN: Joi.string().required(),

        JWT_REFRESH_SECRET: Joi.string().min(32).required(),

        JWT_REFRESH_EXPIRES_IN: Joi.string().required(),

        JWT_REFRESH_COOKIE_NAME: Joi.string().required(),
      }),
    }),

    PrismaModule,
    HealthModule,
    AuthModule,
    WorkspacesModule,
    TeamsModule,
    ProjectsModule,
    TasksModule,
    CommentsModule,
    DashboardModule,
    AnalyticsModule,
    DecisionLogsModule,
    KnowledgeModule,
    UsersModule,
  ],
})
export class AppModule {}
