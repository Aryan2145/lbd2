import { Module } from '@nestjs/common';
import { HabitsService } from './habits.service';
import { HabitsController } from './habits.controller';

@Module({ providers: [HabitsService], controllers: [HabitsController] })
export class HabitsModule {}
