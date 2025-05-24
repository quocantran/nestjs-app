import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerStrategy, UseResilience } from 'nestjs-resilience';
@Injectable()
export class PaymentsService {
  constructor(private configService: ConfigService) {}

  getCurrentDate(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  @UseResilience(
    new CircuitBreakerStrategy({
      requestVolumeThreshold: 5,
      sleepWindowInMilliseconds: 5000,
      rollingWindowInMilliseconds: 10000,
      errorThresholdPercentage: 50,
      timeoutInMilliseconds: 5000,
      fallback: () => {
        return {
          status: 'error',
          transaction_status: 0,
          message:
            'Hệ thống thanh toán hiện không khả dụng, vui lòng thử lại sau ít phút!',
        };
      },
    }),
  )
  async checkPayment(body: { code: string; amount: number }) {
    const { code, amount } = body;
    const PAYMENT_URL = this.configService.get<string>('PAYMENT_URL');
    const PAYMENT_API_KEY = this.configService.get<string>('PAYMENT_API_KEY');
    const currentDate = this.getCurrentDate();

    const data = await this.fetchPaymentData(
      PAYMENT_URL,
      PAYMENT_API_KEY,
      currentDate,
    );

    const recordsPaid = data.data.records;

    for (const record of recordsPaid) {
      if (record.amount >= amount && record.description.includes(code)) {
        return {
          status: 'success',
          transaction_status: 1,
          message: 'Transaction success',
        };
      }
    }

    return {
      status: 'success',
      transaction_status: 0,
      message: 'Transaction failed',
    };
  }

  private async fetchPaymentData(
    PAYMENT_URL: string,
    PAYMENT_API_KEY: string,
    currentDate: string,
  ) {
    Logger.log('Fetching payment data');
    const res = await fetch(`${PAYMENT_URL}?fromDate=${currentDate}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `apikey ${PAYMENT_API_KEY}`,
      },
    });
    const data = await res.json();
    if (!res.ok) {
      Logger.error('Failed to fetch payment data', data);
      throw new Error('Failed to fetch payment data');
    }

    return data;
  }
}
