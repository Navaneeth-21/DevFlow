import { IsUUID } from 'class-validator';

export class CreateTaskDependencyDto {
  @IsUUID()
  predecessorId!: string;
}
