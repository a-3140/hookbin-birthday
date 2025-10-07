import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { User } from '../../users/entities';
import { NotificationLog } from '../entities';
import { WebhookService } from '../services';

@Injectable()
export class RecoveryScheduler {
  private readonly logger = new Logger(RecoveryScheduler.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(NotificationLog)
    private readonly notificationLogRepository: Repository<NotificationLog>,
    private readonly webhookService: WebhookService,
  ) {}

  async recover(startDate: Date, endDate: Date) {
    const missedUsers = await this.usersRepository.find({
      where: { nextBirthdayUtc: Between(startDate, endDate) },
    });

    if (missedUsers.length === 0) return;

    const userIds = missedUsers.map((u) => u.id);

    const sentLogs = await this.notificationLogRepository.find({
      where: {
        userId: In(userIds),
        status: 'sent',
      },
    });

    const sentUserIds = new Set(
      sentLogs.map((log) => `${log.userId}-${log.scheduledFor.getTime()}`),
    );

    for (const user of missedUsers) {
      const logKey = `${user.id}-${user.nextBirthdayUtc.getTime()}`;

      if (!sentUserIds.has(logKey)) {
        this.logger.warn(`Recovering missed birthday for user ${user.id}`);
        try {
          await this.webhookService.sendBirthdayMessage(
            user.firstName,
            user.lastName,
          );
          await this.notificationLogRepository.save({
            userId: user.id,
            type: 'birthday',
            scheduledFor: user.nextBirthdayUtc,
            sentAt: new Date(),
            status: 'sent',
          });
        } catch (error) {
          this.logger.error(`Recovery failed for user ${user.id}: ${error}`);
        }
      }
    }
  }

  @Cron('0 10 * * *')
  async recoverMissedBirthdays() {
    this.logger.log('Running recovery check for missed birthdays...');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const now = new Date();
    await this.recover(yesterday, now);
  }
}
