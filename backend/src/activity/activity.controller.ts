import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivityService } from './activity.service';

class TrackDto {
  @IsString() head: string;
}

@UseGuards(JwtAuthGuard)
@Controller('activity')
export class ActivityController {
  constructor(private activity: ActivityService) {}

  @Post()
  track(@Request() req, @Body() dto: TrackDto) {
    return this.activity.record(req.user.userId, dto.head);
  }
}
