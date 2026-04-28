import { Module } from '@nestjs/common';
import { EveningReflectionsService } from './evening-reflections.service';
import { EveningReflectionsController } from './evening-reflections.controller';

@Module({ providers: [EveningReflectionsService], controllers: [EveningReflectionsController] })
export class EveningReflectionsModule {}
