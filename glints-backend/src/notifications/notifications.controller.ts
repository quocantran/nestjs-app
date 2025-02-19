import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { GetNotificationDto } from './dto/get-notification.dto';
import { ApiTags } from '@nestjs/swagger';
import { MyElasticsearchsService } from 'src/elasticsearchs/myElasticsearchs.service';

@Controller('notifications')
@ApiTags('Notifications Controller')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly elasticsearchsService: MyElasticsearchsService,
  ) {}

  @MessagePattern('job_created')
  async create(
    @Payload() createNotificationDto: CreateNotificationDto,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    const MAX_RETRY = 3;
    try {
      return await this.notificationsService.create(createNotificationDto);
    } catch (err) {
      const msg = JSON.parse(message.content.toString());
      const retryCount = msg.data.retryCount || 0;
      if (retryCount < MAX_RETRY) {
        channel.nack(message, false, false);
      } else {
        Logger.error("Can't process message");
        const dataError = {
          error: {
            name: err.name,
            message: err.message,
            stack: err.stack,
          },
          body: createNotificationDto,
          context: {
            messageId: message.properties.messageId,
            correlationId: message.properties.correlationId,
          },
        };
        this.elasticsearchsService.logErrorToElastic(msg.pattern, dataError);
      }
    }
  }

  @Post('')
  @UseGuards(JwtAuthGuard)
  findNotificationsByUser(
    @Body() body: GetNotificationDto,
    @User() user: IUser,
  ) {
    return this.notificationsService.findAll(body, user);
  }
}
