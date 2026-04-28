import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HabitsService } from './habits.service';

@UseGuards(JwtAuthGuard)
@Controller('habits')
export class HabitsController {
  constructor(private habits: HabitsService) {}

  @Get() findAll(@Request() req) { return this.habits.findAll(req.user.userId); }
  @Post() create(@Request() req, @Body() body: any) { return this.habits.create(req.user.userId, body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.habits.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.habits.remove(id); }
}
