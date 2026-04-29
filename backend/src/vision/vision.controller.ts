import { Controller, Get, Put, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VisionService } from './vision.service';

@UseGuards(JwtAuthGuard)
@Controller('vision')
export class VisionController {
  constructor(private vision: VisionService) {}

  @Get()  get(@Request() req)                   { return this.vision.get(req.user.userId); }
  @Put()  upsert(@Request() req, @Body() body: any) { return this.vision.upsert(req.user.userId, body); }
}
