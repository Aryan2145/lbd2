import { Module } from '@nestjs/common';
import { VisionService } from './vision.service';
import { VisionController } from './vision.controller';
import { MediaModule } from '../media/media.module';

@Module({ imports: [MediaModule], providers: [VisionService], controllers: [VisionController] })
export class VisionModule {}
