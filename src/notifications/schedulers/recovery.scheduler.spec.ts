import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecoveryScheduler } from './recovery.scheduler';
import { WebhookService } from '../services';
import { ScheduledNotification, User } from '@shared/entities';

describe('RecoveryScheduler', () => {
  let scheduler: RecoveryScheduler;

  const mockScheduledNotificationRepository = {
    find: jest.fn(),
    save: jest.fn(),
  };

  const mockWebhookService = {
    sendBirthdayMessage: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecoveryScheduler,
        {
          provide: getRepositoryToken(ScheduledNotification),
          useValue: mockScheduledNotificationRepository,
        },
        { provide: WebhookService, useValue: mockWebhookService },
      ],
    }).compile();

    scheduler = module.get<RecoveryScheduler>(RecoveryScheduler);
  });

  describe('recover', () => {
    const startDate = new Date('2025-01-01T00:00:00Z');
    const endDate = new Date('2025-01-02T00:00:00Z');

    it('returns early if no missed notifications found', async () => {
      mockScheduledNotificationRepository.find.mockResolvedValue([]);

      await scheduler.recover(startDate, endDate);

      expect(mockScheduledNotificationRepository.find).toHaveBeenCalled();
      expect(mockWebhookService.sendBirthdayMessage).not.toHaveBeenCalled();
    });

    it('recovers missed notification if still their birthday', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-01T12:00:00Z'));

      const user: Partial<User> = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: new Date('1990-01-01'),
        timezone: 'UTC',
      };

      const missedNotification: Partial<ScheduledNotification> = {
        id: 1,
        userId: 1,
        type: 'birthday',
        scheduledFor: new Date('2025-01-01T09:00:00Z'),
        status: 'pending',
        user: user as User,
      };

      mockScheduledNotificationRepository.find.mockResolvedValue([
        missedNotification as ScheduledNotification,
      ]);
      mockWebhookService.sendBirthdayMessage.mockResolvedValue(undefined);

      const saveSpy = jest
        .spyOn(mockScheduledNotificationRepository, 'save')
        .mockResolvedValue(missedNotification as ScheduledNotification);

      await scheduler.recover(startDate, endDate);

      expect(mockWebhookService.sendBirthdayMessage).toHaveBeenCalledWith(
        'John',
        'Doe',
      );
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'sent',
        }),
      );

      jest.useRealTimers();
    });

    it('reschedules notification if birthday has passed', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-02T12:00:00Z'));

      const user: Partial<User> = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: new Date('1990-01-01'),
        timezone: 'UTC',
      };

      const missedNotification: Partial<ScheduledNotification> = {
        id: 1,
        userId: 1,
        type: 'birthday',
        scheduledFor: new Date('2025-01-01T09:00:00Z'),
        status: 'pending',
        user: user as User,
      };

      mockScheduledNotificationRepository.find.mockResolvedValue([
        missedNotification as ScheduledNotification,
      ]);

      const saveSpy = jest
        .spyOn(mockScheduledNotificationRepository, 'save')
        .mockResolvedValue(missedNotification as ScheduledNotification);

      await scheduler.recover(startDate, endDate);

      expect(mockWebhookService.sendBirthdayMessage).not.toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
        }),
      );

      const savedNotification = saveSpy.mock
        .calls[0][0] as ScheduledNotification;
      expect(savedNotification.scheduledFor.getFullYear()).toBe(2026);

      jest.useRealTimers();
    });

    it('handles multiple notifications', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-01T12:00:00Z'));

      const user1: Partial<User> = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: new Date('1990-01-01'),
        timezone: 'UTC',
      };

      const user2: Partial<User> = {
        id: 2,
        firstName: 'Jane',
        lastName: 'Smith',
        birthDate: new Date('1995-01-01'),
        timezone: 'UTC',
      };

      const notification1: Partial<ScheduledNotification> = {
        id: 1,
        userId: 1,
        type: 'birthday',
        scheduledFor: new Date('2025-01-01T09:00:00Z'),
        status: 'pending',
        user: user1 as User,
      };

      const notification2: Partial<ScheduledNotification> = {
        id: 2,
        userId: 2,
        type: 'birthday',
        scheduledFor: new Date('2025-01-01T10:00:00Z'),
        status: 'pending',
        user: user2 as User,
      };

      mockScheduledNotificationRepository.find.mockResolvedValue([
        notification1 as ScheduledNotification,
        notification2 as ScheduledNotification,
      ]);
      mockWebhookService.sendBirthdayMessage.mockResolvedValue(undefined);

      const saveSpy = jest
        .spyOn(mockScheduledNotificationRepository, 'save')
        .mockResolvedValue({} as ScheduledNotification);

      await scheduler.recover(startDate, endDate);

      expect(mockWebhookService.sendBirthdayMessage).toHaveBeenCalledTimes(2);
      expect(saveSpy).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('continues processing other notifications if one fails', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-01T12:00:00Z'));

      const user1: Partial<User> = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: new Date('1990-01-01'),
        timezone: 'UTC',
      };

      const user2: Partial<User> = {
        id: 2,
        firstName: 'Jane',
        lastName: 'Smith',
        birthDate: new Date('1995-01-01'),
        timezone: 'UTC',
      };

      const notification1: Partial<ScheduledNotification> = {
        id: 1,
        userId: 1,
        type: 'birthday',
        scheduledFor: new Date('2025-01-01T09:00:00Z'),
        status: 'pending',
        user: user1 as User,
      };

      const notification2: Partial<ScheduledNotification> = {
        id: 2,
        userId: 2,
        type: 'birthday',
        scheduledFor: new Date('2025-01-01T10:00:00Z'),
        status: 'pending',
        user: user2 as User,
      };

      mockScheduledNotificationRepository.find.mockResolvedValue([
        notification1 as ScheduledNotification,
        notification2 as ScheduledNotification,
      ]);
      mockWebhookService.sendBirthdayMessage
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      const saveSpy = jest
        .spyOn(mockScheduledNotificationRepository, 'save')
        .mockResolvedValue({} as ScheduledNotification);

      await scheduler.recover(startDate, endDate);

      expect(mockWebhookService.sendBirthdayMessage).toHaveBeenCalledTimes(2);
      expect(saveSpy).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });
});
