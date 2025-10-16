import axios from 'axios';
import { Repository } from 'typeorm';
import { ScheduledNotification } from '@shared/entities';
import { DatabaseService } from './database.service';
import { HOOKBIN_URL } from '../config/constants';

export class NotificationService {
  private hookbinURL: string;
  private scheduledNotificationRepo!: Repository<ScheduledNotification>;

  constructor() {
    this.hookbinURL = HOOKBIN_URL;
  }

  async init() {
    const db = await DatabaseService.getInstance();
    this.scheduledNotificationRepo = db.getScheduledNotificationRepository();
  }

  async sendBirthdayMessage(firstName: string, lastName: string) {
    await axios.post(this.hookbinURL, {
      message: `Hey, ${firstName} ${lastName} it's your birthday`,
    });
  }

  async updateNotificationStatus(
    notificationId: number,
    status: 'sent' | 'failed',
  ) {
    await this.scheduledNotificationRepo.update(notificationId, { status });
  }

  async incrementAttempts(notificationId: number): Promise<void> {
    await this.scheduledNotificationRepo.increment(
      { id: notificationId },
      'attempts',
      1,
    );
  }

  async getAttempts(notificationId: number): Promise<number> {
    const notification = await this.scheduledNotificationRepo.findOne({
      where: { id: notificationId },
      select: ['attempts'],
    });
    return notification?.attempts || 0;
  }
}
