import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThan } from 'typeorm';
import { WebhookService } from '../services';
import { ScheduledNotification } from '@shared/entities';
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
    @InjectRepository(ScheduledNotification)
    private readonly scheduledNotificationRepository: Repository<ScheduledNotification>,
    private readonly webhookService: WebhookService,
  ) {}

  private isStillTheirBirthday(birthDate: Date, timezone: string): boolean {
    const userNow = toZonedTime(new Date(), timezone);
    const birthMonth = getMonth(birthDate);
    const birthDay = getDate(birthDate);

    return getMonth(userNow) === birthMonth && getDate(userNow) === birthDay;
  }

  async recover(startDate: Date, endDate: Date) {
    const missedNotifications = await this.scheduledNotificationRepository.find(
      {
        where: {
          scheduledFor: Between(startDate, endDate),
          status: In(['pending', 'failed']),
        },
        relations: ['user'],
      },
    );

    if (missedNotifications.length === 0) return;

    for (const notification of missedNotifications) {
      const stillBirthday = this.isStillTheirBirthday(
        notification.user.birthDate,
        notification.user.timezone,
      );

      if (stillBirthday) {
        this.logger.warn(
          `Recovering missed birthday for user ${notification.user.id} (still their birthday in ${notification.user.timezone})`,
        );
        try {
          await this.webhookService.sendBirthdayMessage(
            notification.user.firstName,
            notification.user.lastName,
          );
          notification.status = 'sent';
          await this.scheduledNotificationRepository.save(notification);
        } catch (error) {
          this.logger.error(
            `Recovery failed for user ${notification.user.id}: ${error}`,
          );
        }
      } else {
        this.logger.log(
          `Birthday passed for user ${notification.user.id}, rescheduling to next year`,
        );
        const newScheduledFor = this.calculateNextBirthday(
          notification.user.birthDate,
          notification.user.timezone,
        );
        notification.scheduledFor = newScheduledFor;
        notification.status = 'pending';
        await this.scheduledNotificationRepository.save(notification);
      }
    }
  }

  private calculateNextBirthday(
    birthDate: Date,
    timezone: string,
    sendAtHour: number = 9,
  ): Date {
    const birthMonth = getMonth(birthDate);
    const birthDay = getDate(birthDate);

    const now = toZonedTime(new Date(), timezone);

    let nextBirthday = setMonth(now, birthMonth);
    nextBirthday = setDate(nextBirthday, birthDay);
    nextBirthday = setHours(nextBirthday, sendAtHour);
    nextBirthday = setMinutes(nextBirthday, 0);
    nextBirthday = setSeconds(nextBirthday, 0);
    nextBirthday = setMilliseconds(nextBirthday, 0);

    if (nextBirthday <= now) {
      nextBirthday = addYears(nextBirthday, 1);
    }

    return fromZonedTime(nextBirthday, timezone);
  }

  async cleanupStuckBirthdays() {
    this.logger.log('Running cleanup for stuck birthdays...');
    const lookbackDays = 7 * 24 * 60 * 60 * 1000;
    const recoveryWindowStart = new Date(Date.now() - lookbackDays);

    const stuckNotifications = await this.scheduledNotificationRepository.find({
      where: {
        scheduledFor: LessThan(recoveryWindowStart),
        type: 'birthday',
        status: In(['pending', 'failed']),
      },
      relations: ['user'],
    });

    if (stuckNotifications.length === 0) {
      this.logger.log('No stuck birthdays found');
      return;
    }

    this.logger.warn(
      `Found ${stuckNotifications.length} notifications with stuck birthdays (older than 7 days)`,
    );

    for (const notification of stuckNotifications) {
      const newScheduledFor = this.calculateNextBirthday(
        notification.user.birthDate,
        notification.user.timezone,
      );
      notification.scheduledFor = newScheduledFor;
      notification.status = 'pending';
      await this.scheduledNotificationRepository.save(notification);
      this.logger.log(
        `Updated notification ${notification.id} scheduledFor to ${newScheduledFor.toISOString()}`,
      );
    }
  }

  async onModuleInit() {
    this.logger.log(
      'Running recovery check for missed birthdays on startup...',
    );

    await this.cleanupStuckBirthdays();

    // look back 12 hours to catch recent misses
    // the recover method will check if it's still their birthday in their timezone
    const lookbackHours = 12 * 60 * 60 * 1000;
    const startDate = new Date(Date.now() - lookbackHours);
    const now = new Date();
    await this.recover(startDate, now);
  }
}
