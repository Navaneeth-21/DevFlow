import { Module } from '@nestjs/common';

import { DecisionLogsController } from './controller/decision-logs.controller.js';
import { DecisionLogsService } from './services/decision-logs.service.js';

@Module({
  controllers: [DecisionLogsController],
  providers: [DecisionLogsService],
})
export class DecisionLogsModule {}
