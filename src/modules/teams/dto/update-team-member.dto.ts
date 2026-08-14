import { IsEnum } from 'class-validator';

import { TeamRole } from '../../../../generated/prisma/client.js';

export class UpdateTeamMemberDto {
  @IsEnum(TeamRole)
  role!: TeamRole;
}
