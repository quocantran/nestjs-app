import { Module } from '@nestjs/common';
import { MyElasticsearchsService } from './myElasticsearchs.service';
import { ElasticsearchsController } from './elasticsearchs.controller';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { CompaniesModule } from 'src/companies/companies.module';
import { JobsModule } from 'src/jobs/jobs.module';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        node: configService.get<string>('ELASTICSEARCH_NODE'),
        auth: {
          username: configService.get<string>('ELASTICSEARCH_USERNAME'),
          password: configService.get<string>('ELASTICSEARCH_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),

    ClientsModule.registerAsync([
      {
        name: 'ERROR_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RMQ_URL')],
            queue: configService.get<string>('LOG_ERROR_QUEUE'),
            noAck: false,
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],

  controllers: [ElasticsearchsController],
  providers: [MyElasticsearchsService],
  exports: [ElasticsearchsModule, MyElasticsearchsService],
})
export class ElasticsearchsModule {}
