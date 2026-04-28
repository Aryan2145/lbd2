import { Controller, Get, Put, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WeeklyReviewsService } from './weekly-reviews.service';

@UseGuards(JwtAuthGuard)
@Controller('weekly-reviews')
export class WeeklyReviewsController {
  constructor(private service: WeeklyReviewsService) {}

  @Get() findAll(@Request() req) { return this.service.findAll(req.user.userId); }

  @Put()
  upsert(@Request() req, @Body() body: { weekStart: string; [key: string]: any }) {
    const { weekStart, ...data } = body;
    return this.service.upsert(req.user.userId, weekStart, data);
  }
}
