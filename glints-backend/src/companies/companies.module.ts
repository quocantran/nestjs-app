import { forwardRef, Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Company, CompanySchema } from './schemas/company.schema';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchsModule } from 'src/elasticsearchs/elasticsearchs.module';
import { RedisModule } from 'src/redis/redis.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Company.name, schema: CompanySchema }]),
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
    RedisModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompaniesModule],
  exports: [CompaniesService, CompaniesModule],
})
export class CompaniesModule {}
