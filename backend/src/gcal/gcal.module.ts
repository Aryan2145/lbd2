import { Module } from '@nestjs/common';
import { GcalService } from './gcal.service';

@Module({ providers: [GcalService], exports: [GcalService] })
export class GcalModule {}
