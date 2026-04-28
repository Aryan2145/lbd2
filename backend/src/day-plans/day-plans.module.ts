import { Module } from '@nestjs/common';
import { DayPlansService } from './day-plans.service';
import { DayPlansController } from './day-plans.controller';

@Module({ providers: [DayPlansService], controllers: [DayPlansController] })
export class DayPlansModule {}
