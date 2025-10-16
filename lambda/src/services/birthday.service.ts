import { Between, Repository, In } from 'typeorm';
import { ScheduledNotification } from '@shared/entities';
import { DatabaseService } from './database.service';

export class BirthdayService {
  private scheduledNotificationRepo!: Repository<ScheduledNotification>;

  async init() {
    const db = await DatabaseService.getInstance();
    this.scheduledNotificationRepo = db.getScheduledNotificationRepository();
  }

  async getPendingNotifications(from: Date, to: Date) {
    return this.scheduledNotificationRepo.find({
      where: {
        scheduledFor: Between(from, to),
        status: 'pending',
      },
      relations: ['user'],
    });
  }

  async markAsProcessing(notificationIds: number[]): Promise<void> {
    if (notificationIds.length === 0) return;

    await this.scheduledNotificationRepo.update(
      { id: In(notificationIds) },
      { status: 'processing' },
    );
  }
}
