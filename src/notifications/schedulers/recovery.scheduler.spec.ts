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

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  describe('recover', () => {
    const startDate = new Date('2025-01-01T00:00:00Z');
    const endDate = new Date('2025-01-02T00:00:00Z');

    it('should return early if no missed notifications found', async () => {
      mockScheduledNotificationRepository.find.mockResolvedValue([]);

      await scheduler.recover(startDate, endDate);

      expect(mockScheduledNotificationRepository.find).toHaveBeenCalled();
      expect(mockWebhookService.sendBirthdayMessage).not.toHaveBeenCalled();
    });

    it('should recover missed birthday notification', async () => {
      const user: Partial<User> = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: new Date('1990-06-15'),
        timezone: 'Australia/Sydney',
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
      mockScheduledNotificationRepository.save.mockResolvedValue(
        missedNotification as ScheduledNotification,
      );

      await scheduler.recover(startDate, endDate);

      expect(mockWebhookService.sendBirthdayMessage).toHaveBeenCalledWith(
        'John',
        'Doe',
      );
      expect(mockScheduledNotificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'sent',
        }),
      );
    });

    it('should skip notification if already sent', async () => {
      mockScheduledNotificationRepository.find.mockResolvedValue([]);

      await scheduler.recover(startDate, endDate);

      expect(mockWebhookService.sendBirthdayMessage).not.toHaveBeenCalled();
      expect(mockScheduledNotificationRepository.save).not.toHaveBeenCalled();
    });

    it('should handle multiple notifications', async () => {
      const user1: Partial<User> = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: new Date('1990-06-15'),
        timezone: 'Australia/Sydney',
      };

      const user2: Partial<User> = {
        id: 2,
        firstName: 'Jane',
        lastName: 'Smith',
        birthDate: new Date('1995-12-25'),
        timezone: 'America/New_York',
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
      mockScheduledNotificationRepository.save.mockResolvedValue(
        {} as ScheduledNotification,
      );

      await scheduler.recover(startDate, endDate);

      expect(mockWebhookService.sendBirthdayMessage).toHaveBeenCalledTimes(2);
      expect(mockWebhookService.sendBirthdayMessage).toHaveBeenCalledWith(
        'John',
        'Doe',
      );
      expect(mockWebhookService.sendBirthdayMessage).toHaveBeenCalledWith(
        'Jane',
        'Smith',
      );
      expect(mockScheduledNotificationRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should continue processing other notifications if one fails', async () => {
      const user1: Partial<User> = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: new Date('1990-06-15'),
        timezone: 'Australia/Sydney',
      };

      const user2: Partial<User> = {
        id: 2,
        firstName: 'Jane',
        lastName: 'Smith',
        birthDate: new Date('1995-12-25'),
        timezone: 'America/New_York',
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
      mockScheduledNotificationRepository.save.mockResolvedValue(
        {} as ScheduledNotification,
      );

      await scheduler.recover(startDate, endDate);

      expect(mockWebhookService.sendBirthdayMessage).toHaveBeenCalledTimes(2);
      expect(mockScheduledNotificationRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should process multiple notifications efficiently', async () => {
      const user1: Partial<User> = {
        id: 1,
        firstName: 'User1',
        lastName: 'Test',
        birthDate: new Date('1990-01-15'),
        timezone: 'Australia/Sydney',
      };

      const user2: Partial<User> = {
        id: 2,
        firstName: 'User2',
        lastName: 'Test',
        birthDate: new Date('1991-02-20'),
        timezone: 'America/New_York',
      };

      const user3: Partial<User> = {
        id: 3,
        firstName: 'User3',
        lastName: 'Test',
        birthDate: new Date('1992-03-25'),
        timezone: 'Europe/London',
      };

      const notifications = [
        {
          id: 1,
          userId: 1,
          type: 'birthday',
          scheduledFor: new Date('2025-01-01T09:00:00Z'),
          status: 'pending',
          user: user1 as User,
        },
        {
          id: 2,
          userId: 2,
          type: 'birthday',
          scheduledFor: new Date('2025-01-01T10:00:00Z'),
          status: 'pending',
          user: user2 as User,
        },
        {
          id: 3,
          userId: 3,
          type: 'birthday',
          scheduledFor: new Date('2025-01-01T11:00:00Z'),
          status: 'pending',
          user: user3 as User,
        },
      ];

      mockScheduledNotificationRepository.find.mockResolvedValue(
        notifications as ScheduledNotification[],
      );
      mockWebhookService.sendBirthdayMessage.mockResolvedValue(undefined);
      mockScheduledNotificationRepository.save.mockResolvedValue(
        {} as ScheduledNotification,
      );

      await scheduler.recover(startDate, endDate);

      expect(mockScheduledNotificationRepository.find).toHaveBeenCalledTimes(1);
      expect(mockWebhookService.sendBirthdayMessage).toHaveBeenCalledTimes(3);
      expect(mockScheduledNotificationRepository.save).toHaveBeenCalledTimes(3);
    });
  });
});
