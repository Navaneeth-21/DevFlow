import { PartialType } from '@nestjs/mapped-types';

import { CreateDecisionLogDto } from './create-decision-log.dto.js';

export class UpdateDecisionLogDto extends PartialType(CreateDecisionLogDto) {}
