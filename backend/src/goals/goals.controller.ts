import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GoalsService } from './goals.service';

@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private goals: GoalsService) {}

  @Get() findAll(@Request() req) { return this.goals.findAll(req.user.userId); }
  @Post() create(@Request() req, @Body() body: any) { return this.goals.create(req.user.userId, body); }
  @Patch(':id') update(@Request() req, @Param('id') id: string, @Body() body: any) { return this.goals.update(id, req.user.userId, body); }
  @Delete(':id') remove(@Request() req, @Param('id') id: string) { return this.goals.remove(id, req.user.userId); }

  @Post(':id/notes') addNote(@Param('id') id: string, @Body() body: { text: string }) { return this.goals.addNote(id, body.text); }
  @Delete(':id/notes/:noteId') removeNote(@Param('noteId') noteId: string) { return this.goals.removeNote(noteId); }
}
