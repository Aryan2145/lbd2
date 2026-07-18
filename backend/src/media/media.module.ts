import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { ImageService } from './image.service';

@Module({
  imports: [StorageModule],
  providers: [MediaService, ImageService],
  controllers: [MediaController],
  exports: [MediaService],
})
export class MediaModule {}
