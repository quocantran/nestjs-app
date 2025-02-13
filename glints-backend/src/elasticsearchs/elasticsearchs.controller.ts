import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { MyElasticsearchsService } from './myElasticsearchs.service';
import { SearchElasticsearchDto } from './dto/search-elasticsearch.dto';
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

  @Post('search')
  async search(@Body() body: SearchElasticsearchDto) {
    return await this.elasticsearchsService.search(body);
  }

  @MessagePattern('deleteDocument')
  async delete(
    @Payload() body: { index: string; id: string },
    @Ctx() context: RmqContext,
  ) {
    try {
      await this.elasticsearchsService.delete(body.index, body.id);
      const channel = context.getChannelRef();
      channel.ack(context.getMessage());
    } catch (err) {
      Logger.error('Error::::::', err);
      const channel = context.getChannelRef();
      const message = context.getMessage();
      channel.nack(message, false, false);
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
    try {
      await this.elasticsearchsService.createDocument(
        body.index,
        body.document,
      );
      channel.ack(message);
    } catch (err) {
      Logger.error('Error::::::', err);

      channel.nack(message, false, false);
    }
  }
}
