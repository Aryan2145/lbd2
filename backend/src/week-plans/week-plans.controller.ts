import { Controller, Get, Put, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WeekPlansService } from './week-plans.service';

@UseGuards(JwtAuthGuard)
@Controller('week-plans')
export class WeekPlansController {
  constructor(private service: WeekPlansService) {}

  @Get() findAll(@Request() req) { return this.service.findAll(req.user.userId); }

  @Put()
  upsert(@Request() req, @Body() body: { weekStart: string; [key: string]: any }) {
    const { weekStart, ...data } = body;
    return this.service.upsert(req.user.userId, weekStart, data);
  }
}
