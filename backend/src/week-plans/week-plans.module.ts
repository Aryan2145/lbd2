import { Module } from '@nestjs/common';
import { WeekPlansService } from './week-plans.service';
import { WeekPlansController } from './week-plans.controller';

@Module({ providers: [WeekPlansService], controllers: [WeekPlansController] })
export class WeekPlansModule {}
