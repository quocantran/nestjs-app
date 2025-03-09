import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { JobsModule } from 'src/jobs/jobs.module';

@Module({
  imports: [],
  providers: [RedisService],
  exports: [RedisModule, RedisService],
})
export class RedisModule {}
