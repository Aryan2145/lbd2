import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { AdminGuard } from '../admin/admin-auth.guard';

@UseGuards(AdminGuard)
@Controller('admin/leaderboard')
export class LeaderboardController {
  constructor(private leaderboard: LeaderboardService) {}

  // Returns the group grid plus the ranked list for the selected group.
  @Get()
  board(@Query('group') group?: string) {
    return this.leaderboard.board(group?.trim() || undefined);
  }
}
