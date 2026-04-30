import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { GcalModule } from '../gcal/gcal.module';

@Module({
  imports: [GcalModule],
  providers: [CalendarService],
  controllers: [CalendarController],
})
export class CalendarModule {}
