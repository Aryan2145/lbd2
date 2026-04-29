import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Controller, Get } from '@nestjs/common';

@Controller('health')
class HealthController {
  @Get() check() { return { status: 'ok' }; }
}

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GoalsModule } from './goals/goals.module';
import { HabitsModule } from './habits/habits.module';
import { TasksModule } from './tasks/tasks.module';
import { CalendarModule } from './calendar/calendar.module';
import { WeekPlansModule } from './week-plans/week-plans.module';
import { DayPlansModule } from './day-plans/day-plans.module';
import { EveningReflectionsModule } from './evening-reflections/evening-reflections.module';
import { WeeklyReviewsModule } from './weekly-reviews/weekly-reviews.module';
import { BucketModule } from './bucket/bucket.module';
import { SupportModule } from './support/support.module';
import { VisionModule } from './vision/vision.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    GoalsModule,
    HabitsModule,
    TasksModule,
    CalendarModule,
    WeekPlansModule,
    DayPlansModule,
    EveningReflectionsModule,
    WeeklyReviewsModule,
    BucketModule,
    SupportModule,
    VisionModule,
  ],
})
export class AppModule {}
