import { Module } from '@nestjs/common';
import { LegacyService } from './legacy.service';
import { LegacyController } from './legacy.controller';

@Module({ providers: [LegacyService], controllers: [LegacyController] })
export class LegacyModule {}
