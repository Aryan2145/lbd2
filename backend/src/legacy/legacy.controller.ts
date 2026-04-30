import { Controller, Get, Put, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LegacyService } from './legacy.service';

@UseGuards(JwtAuthGuard)
@Controller('legacy')
export class LegacyController {
  constructor(private legacy: LegacyService) {}

  @Get() get(@Request() req)                        { return this.legacy.get(req.user.userId); }
  @Put() upsert(@Request() req, @Body() body: any)  { return this.legacy.upsert(req.user.userId, body); }
}
