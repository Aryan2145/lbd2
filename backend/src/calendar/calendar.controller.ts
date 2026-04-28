import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CalendarService } from './calendar.service';

@UseGuards(JwtAuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private cal: CalendarService) {}

  @Get('groups') findGroups(@Request() req) { return this.cal.findGroups(req.user.userId); }
  @Post('groups') createGroup(@Request() req, @Body() body: any) { return this.cal.createGroup(req.user.userId, body); }
  @Patch('groups/:id') updateGroup(@Param('id') id: string, @Body() body: any) { return this.cal.updateGroup(id, body); }
  @Delete('groups/:id') removeGroup(@Param('id') id: string) { return this.cal.removeGroup(id); }

  @Post('events') createEvent(@Request() req, @Body() body: any) { return this.cal.createEvent(req.user.userId, body); }
  @Patch('events/:id') updateEvent(@Param('id') id: string, @Body() body: any) { return this.cal.updateEvent(id, body); }
  @Delete('events/:id') removeEvent(@Param('id') id: string) { return this.cal.removeEvent(id); }
}
