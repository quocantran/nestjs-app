import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { MyElasticsearchsService } from './myElasticsearchs.service';
import { SearchCompaniesElasticsearchDto } from './dto/search-companies-elasticsearch.dto';
import { GetPaginateElasticsearchDto } from './dto/get-paginate-elasticsearch.dto';
import {
  ClientProxy,
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { ApiTags } from '@nestjs/swagger';
import { SearchJobsElasticsearchDto } from './dto/search-jobs-elasticsearch-dto';

@ApiTags('Elasticsearch')
@Controller('elasticsearchs')
export class ElasticsearchsController {
  constructor(
    private readonly elasticsearchsService: MyElasticsearchsService,
  ) {}

  @Post('get-paginate')
  async getDocumentsPaginate(@Body() body: GetPaginateElasticsearchDto) {
    return await this.elasticsearchsService.getDocumentsPaginate(body);
  }

  @Post('/companies/search')
  async searchCompanies(@Body() body: SearchCompaniesElasticsearchDto) {
    return await this.elasticsearchsService.searchCompanies(body);
  }

  @Post('/jobs/search')
  async searchJobs(@Body() body: SearchJobsElasticsearchDto) {
    return await this.elasticsearchsService.searchJobs(body);
  }

  @MessagePattern('deleteDocument')
  async delete(
    @Payload() body: { index: string; id: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    const MAX_RETRY = 3;
    try {
      await this.elasticsearchsService.delete(body.index, body.id);
      channel.ack(context.getMessage());
    } catch (err) {
      const msg = JSON.parse(message.content.toString());
      const retryCount = msg.data.retryCount || 0;
      if (retryCount < MAX_RETRY) {
        channel.nack(message, false, false);
      } else {
        const dataError = {
          error: {
            name: err.name,
            message: err.message,
            stack: err.stack,
          },
          body: body,
          context: {
            messageId: message.properties.messageId,
            correlationId: message.properties.correlationId,
          },
        };
        this.elasticsearchsService.logErrorToElastic(msg.pattern, dataError);
      }
    }
  }

  @Get(':index/_mapping')
  async getMapping(@Param('index') index: string) {
    return await this.elasticsearchsService.getMapping(index);
  }

  @MessagePattern('createDocument')
  async createDocument(
    @Payload() body: { index: string; document: any },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    const MAX_RETRY = 3;
    try {
      await this.elasticsearchsService.createDocument(
        body.index,
        body.document,
      );
      channel.ack(message);
    } catch (err) {
      const msg = JSON.parse(message.content.toString());
      const retryCount = msg.data.retryCount || 0;
      if (retryCount < MAX_RETRY) {
        channel.nack(message, false, false);
      } else {
        const dataError = {
          error: {
            name: err.name,
            message: err.message,
            stack: err.stack,
          },
          body: body,
          context: {
            messageId: message.properties.messageId,
            correlationId: message.properties.correlationId,
          },
        };
        this.elasticsearchsService.logErrorToElastic(msg.pattern, dataError);
      }
    }
  }
}
