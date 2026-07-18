import { Module } from '@nestjs/common';
import { ValuesService } from './values.service';
import { ValuesController } from './values.controller';

@Module({ providers: [ValuesService], controllers: [ValuesController] })
export class ValuesModule {}
