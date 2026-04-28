import { Module } from '@nestjs/common';
import { WeeklyReviewsService } from './weekly-reviews.service';
import { WeeklyReviewsController } from './weekly-reviews.controller';

@Module({ providers: [WeeklyReviewsService], controllers: [WeeklyReviewsController] })
export class WeeklyReviewsModule {}
