import { Controller, Get } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerService } from '@nestjs-modules/mailer';
import { Cron } from '@nestjs/schedule';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Cron('0 0 * * 0') // Run every Sunday at midnight
  async sendMailToSubscribers() {
    return await this.mailService.sendMailToSubscribers();
  }
}
