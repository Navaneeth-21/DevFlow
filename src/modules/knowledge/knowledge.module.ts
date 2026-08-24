import { Module } from '@nestjs/common';
import { KnowledgeController } from './controller/knowledge.controller.js';
import { KnowledgeService } from './service/knowledge.service.js';

@Module({
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
})
export class KnowledgeModule {}
