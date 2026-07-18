import { Body, Controller, Get, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ValuesService } from './values.service';

@UseGuards(JwtAuthGuard)
@Controller('values')
export class ValuesController {
  constructor(private values: ValuesService) {}

  @Get()
  get(@Request() req) {
    return this.values.get(req.user.userId);
  }

  @Put()
  put(@Request() req, @Body() body: { selected?: unknown; custom?: unknown }) {
    return this.values.put(req.user.userId, body.selected, body.custom);
  }
}
