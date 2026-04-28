import { Controller, Get, Put, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DayPlansService } from './day-plans.service';

@UseGuards(JwtAuthGuard)
@Controller('day-plans')
export class DayPlansController {
  constructor(private service: DayPlansService) {}

  @Get() findAll(@Request() req) { return this.service.findAll(req.user.userId); }

  @Put()
  upsert(@Request() req, @Body() body: { date: string; [key: string]: any }) {
    const { date, ...data } = body;
    return this.service.upsert(req.user.userId, date, data);
  }
}
