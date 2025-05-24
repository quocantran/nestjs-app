import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthSocketGuard } from 'src/auth/socket-auth.guard';
import { CompaniesService } from 'src/companies/companies.service';
import { Public } from 'src/decorator/customize';
import { JobsService } from 'src/jobs/jobs.service';
import { PaymentsService } from 'src/payments/payments.service';
import { FindByJobResumeDto } from 'src/resumes/dto/findbyjob-resume.dto';
import { ResumesService } from 'src/resumes/resumes.service';
import { IUser } from 'src/users/users.interface';

@WebSocketGateway({
  cors: {
    origin: ['https://site.recruitment-app.id.vn', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  constructor(
    private readonly jobsService: JobsService,
    private readonly companieSerivce: CompaniesService,
    private readonly resumesService: ResumesService,
    private readonly paymentsService: PaymentsService,
    private readonly jwtService: JwtService,
  ) {}

  private clients: Map<string, Socket> = new Map();

  afterInit(server: Server) {
    console.log('Init');
  }

  handleConnection(client: Socket, ...args: any[]) {
    const accessToken = client.handshake.query.accessToken as string;

    const decoded = this.jwtService.decode(accessToken) as any;
    if (decoded !== null) {
      let userEmail = decoded.email;

      if (userEmail) {
        this.clients.set(userEmail, client);
      }
    }
  }

  handleDisconnect(client: Socket) {
    let currentUser: string | undefined;
    for (const [userEmail, socket] of this.clients.entries()) {
      if (socket.id === client.id) {
        currentUser = userEmail;
        break;
      }
    }
    if (currentUser) {
      this.clients.delete(currentUser);
    }
  }

  @SubscribeMessage('message')
  @UseGuards(AuthSocketGuard)
  handleMessage(client: Socket, payload: any): void {
    this.server.emit('message', payload);
  }

  @SubscribeMessage('typing')
  @UseGuards(AuthSocketGuard)
  handleTyping(client: Socket, payload: any): void {
    client.broadcast.emit('typing', payload);
  }

  @UseGuards(AuthSocketGuard)
  @SubscribeMessage('stopTyping')
  handleStopTyping(client: Socket): void {
    client.broadcast.emit('stopTyping');
  }

  @SubscribeMessage('notification')
  @UseGuards(AuthSocketGuard)
  async handleSendNotificationFromServer(
    client: Socket,
    payload: any,
  ): Promise<void> {
    if (payload?.senderId) {
      const company = await this.companieSerivce.findWithUserFollow(
        payload.senderId,
      );
      if (company) {
        company.usersFollow.forEach((user: any) => {
          const targetClient = this.clients.get(user.email);
          if (targetClient) {
            const messages = `Công ty bạn đang theo dõi ${company.name} đã tạo mới công việc ${payload.jobName}!`;
            targetClient.emit('notification', {
              message: messages,
              companyName: company.name,
              jobId: payload.jobId,
              type: 'job',
            });
            console.log(`Notification sent to userId: ${user.email}`);
          } else {
            console.log(`User with userId: ${user.email} not found`);
          }
        });
      }
    }
  }

  @SubscribeMessage('checkPayment')
  @UseGuards(AuthSocketGuard)
  async handleTransactionSuccess(client: Socket, payload: any): Promise<void> {
    const { jobId, userId, code } = payload;
    const valid = await this.paymentsService.checkPayment({
      code,
      amount: 2000,
    });

    if (!valid.transaction_status || valid.status === 'error') {
      if (valid.status != 'error') {
        client.emit('checkPayment', {
          message: 'Transaction failed',
          status: 0,
        });
      } else {
        client.emit('checkPayment', {
          message: valid.message,
          status: 'error',
        });
      }
      return;
    }

    await this.jobsService.addPaidUser(jobId, userId);
    client.emit('checkPayment', {
      message: 'Transaction success',
      status: 1,
    });
  }
}
