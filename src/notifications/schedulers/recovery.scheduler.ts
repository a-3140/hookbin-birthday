import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThan } from 'typeorm';
import { WebhookService } from '../services';
import { NotificationLog, User } from '@shared/entities';
import {
  addYears,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  getMonth,
  getDate,
  setMonth,
  setDate,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

@Injectable()
export class RecoveryScheduler implements OnModuleInit {
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

  private calculateNextBirthday(user: User): Date {
    const birthMonth = getMonth(user.birthDate);
    const birthDay = getDate(user.birthDate);

    const now = toZonedTime(new Date(), user.timezone);

    let nextBirthday = setMonth(now, birthMonth);
    nextBirthday = setDate(nextBirthday, birthDay);
    nextBirthday = setHours(nextBirthday, 0);
    nextBirthday = setMinutes(nextBirthday, 0);
    nextBirthday = setSeconds(nextBirthday, 0);
    nextBirthday = setMilliseconds(nextBirthday, 0);

    if (nextBirthday <= now) {
      nextBirthday = addYears(nextBirthday, 1);
    }

    return fromZonedTime(nextBirthday, user.timezone);
  }

  async cleanupStuckBirthdays() {
    this.logger.log('Running cleanup for stuck birthdays...');
    const now = new Date();
    const lookbackHours = 26 * 60 * 60 * 1000;
    const recoveryWindowStart = new Date(Date.now() - lookbackHours);

    const stuckUsers = await this.usersRepository.find({
      where: { nextBirthdayUtc: LessThan(recoveryWindowStart) },
    });

    if (stuckUsers.length === 0) {
      this.logger.log('No stuck birthdays found');
      return;
    }

    this.logger.warn(`Found ${stuckUsers.length} users with stuck birthdays`);

    for (const user of stuckUsers) {
      const newNextBirthday = this.calculateNextBirthday(user);
      user.nextBirthdayUtc = newNextBirthday;
      await this.usersRepository.save(user);
      this.logger.log(
        `Updated user ${user.id} nextBirthdayUtc to ${newNextBirthday.toISOString()}`,
      );
    }
  }

  async onModuleInit() {
    this.logger.log(
      'Running recovery check for missed birthdays on startup...',
    );

    await this.cleanupStuckBirthdays();

    // 26 is the farthest between timezones
    const lookbackHours = 26 * 60 * 60 * 1000;
    const startDate = new Date(Date.now() - lookbackHours);
    const now = new Date();
    await this.recover(startDate, now);
  }
}
