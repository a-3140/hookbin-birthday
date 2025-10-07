import axios from 'axios';
import { In, Repository } from 'typeorm';
import { NotificationLog } from '@shared/entities';
import { DatabaseService } from './database.service';

export class NotificationService {
  private hookbinURL: string;
  private logRepo!: Repository<NotificationLog>;

  constructor() {
    const url = process.env.HOOKBIN_URL;
    if (!url) {
      throw new Error('Missing HOOKBIN_URL environment variable');
    }
    this.hookbinURL = url;
  }

  async init() {
    const db = await DatabaseService.getInstance();
    this.logRepo = db.getNotificationLogRepository();
  }

  async sendBirthdayMessage(firstName: string, lastName: string) {
    await axios.post(this.hookbinURL, {
      message: `Hey, ${firstName} ${lastName} it's your birthday`,
    });
  }

  async logNotification(
    userId: number,
    scheduledFor: Date,
    status: 'sent' | 'failed',
  ) {
    await this.logRepo.save({
      userId,
      type: 'birthday',
      scheduledFor,
      sentAt: status === 'sent' ? new Date() : undefined,
      status,
    });
  }

  async getAlreadySentNotifications(userIds: number[]) {
    return this.logRepo.find({
      where: {
        userId: In(userIds),
        status: 'sent',
      },
    });
  }
}
