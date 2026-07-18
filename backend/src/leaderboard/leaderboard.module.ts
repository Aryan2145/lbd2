import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';

@Module({
  imports: [AdminModule], // reuse AdminGuard + JwtModule for the same admin session
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
})
export class LeaderboardModule {}
