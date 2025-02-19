import { Module } from '@nestjs/common';
import { InitService } from './init.service';
import { JobsModule } from 'src/jobs/jobs.module';
import { ElasticsearchsModule } from 'src/elasticsearchs/elasticsearchs.module';
import { CompaniesModule } from 'src/companies/companies.module';

@Module({
  imports: [JobsModule, ElasticsearchsModule, CompaniesModule],
  providers: [InitService],
  exports: [InitService, InitModule],
})
export class InitModule {}
