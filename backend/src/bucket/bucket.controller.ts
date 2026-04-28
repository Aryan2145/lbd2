import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BucketService } from './bucket.service';

@UseGuards(JwtAuthGuard)
@Controller('bucket')
export class BucketController {
  constructor(private service: BucketService) {}

  @Get() findAll(@Request() req) { return this.service.findAll(req.user.userId); }
  @Post() create(@Request() req, @Body() body: any) { return this.service.create(req.user.userId, body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
