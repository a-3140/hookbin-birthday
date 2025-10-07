import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private url: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const hookbinURL = this.configService.get<string>('HOOKBIN_URL');
    if (!hookbinURL) {
      throw new Error('Missing HOOKBIN_URL environment variable');
    }
    this.url = hookbinURL;
  }

  async sendBirthdayMessage(
    firstName: string,
    lastName: string,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(this.url, {
          message: `Hey, ${firstName} ${lastName} it's your birthday`,
        }),
      );
      this.logger.log(`Birthday message sent for ${firstName} ${lastName}`);
    } catch (error) {
      this.logger.error(`Failed to send birthday message: ${error}`);
      throw error;
    }
  }
}
