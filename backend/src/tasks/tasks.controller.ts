import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from './tasks.service';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasks: TasksService) {}

  @Get() findAll(@Request() req) { return this.tasks.findAll(req.user.userId); }
  @Post() create(@Request() req, @Body() body: any) { return this.tasks.create(req.user.userId, body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.tasks.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.tasks.remove(id); }
}
