import { forwardRef, Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Job, JobSchema } from './schemas/job.schema';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchsModule } from 'src/elasticsearchs/elasticsearchs.module';
import { CompaniesModule } from 'src/companies/companies.module';
import { RedisModule } from 'src/redis/redis.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
    ClientsModule.registerAsync([
      {
        name: 'NOTI_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RMQ_URL')],
            queue: configService.get<string>('NOTI_QUEUE'),
            noAck: false,
            queueOptions: {
              durable: true,
              arguments: {
                'x-message-ttl': 4000,
                'x-dead-letter-exchange':
                  configService.get<string>('EXCHANGE_DLX'),
                'x-dead-letter-routing-key':
                  configService.get<string>('ROUTING_KEY_DLX'),
              },
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    ClientsModule.registerAsync([
      {
        name: 'ELASTIC_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RMQ_URL')],
            queue: configService.get<string>('ELASTIC_QUEUE'),
            noAck: false,
            queueOptions: {
              durable: true,

              deadLetterExchange: configService.get<string>('EXCHANGE_DLX'),
              deadLetterRoutingKey:
                configService.get<string>('ROUTING_KEY_DLX'),
              messageTtl: 4000,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    ElasticsearchsModule,
    CompaniesModule,
    RedisModule,

    forwardRef(() => UsersModule),
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService, JobsModule],
})
export class JobsModule {}
