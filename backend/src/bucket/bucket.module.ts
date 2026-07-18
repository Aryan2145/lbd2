import { Module } from '@nestjs/common';
import { BucketService } from './bucket.service';
import { BucketController } from './bucket.controller';
import { MediaModule } from '../media/media.module';

@Module({ imports: [MediaModule], providers: [BucketService], controllers: [BucketController] })
export class BucketModule {}
