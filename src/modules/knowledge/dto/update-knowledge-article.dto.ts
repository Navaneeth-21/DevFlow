import { PartialType } from '@nestjs/mapped-types';

import { CreateKnowledgeArticleDto } from './create-knowledge-article.dto.js';

export class UpdateKnowledgeArticleDto extends PartialType(
  CreateKnowledgeArticleDto,
) {}
