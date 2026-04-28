import { Controller, Get, Post, Patch, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SupportService } from './support.service';

@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private service: SupportService) {}

  @Get() findAll(@Request() req) { return this.service.findAll(req.user.userId); }
  @Post() create(@Request() req, @Body() body: any) { return this.service.create(req.user.userId, body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }
}
