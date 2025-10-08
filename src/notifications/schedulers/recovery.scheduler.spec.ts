import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecoveryScheduler } from './recovery.scheduler';
import { WebhookService } from '../services';
import { NotificationLog, User } from '@shared/entities';

describe('RecoveryScheduler', () => {
  let scheduler: RecoveryScheduler;

  const mockUsersRepository = {
    find: jest.fn(),
  };

  const mockNotificationLogRepository = {
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
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        {
          provide: getRepositoryToken(NotificationLog),
          useValue: mockNotificationLogRepository,
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

    it('should return early if no missed users found', async () => {
      mockUsersRepository.find.mockResolvedValue([]);

      await scheduler.recover(startDate, endDate);

      expect(mockUsersRepository.find).toHaveBeenCalled();
      expect(mockNotificationLogRepository.find).not.toHaveBeenCalled();
      expect(mockWebhookService.sendBirthdayMessage).not.toHaveBeenCalled();
    });

    it('should recover missed birthday for user without notification log', async () => {
      const missedUser: Partial<User> = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        nextBirthdayUtc: new Date('2025-01-01T09:00:00Z'),
      };

      mockUsersRepository.find.mockResolvedValue([missedUser as User]);
      mockNotificationLogRepository.find.mockResolvedValue([]);
      mockWebhookService.sendBirthdayMessage.mockResolvedValue(undefined);
      mockNotificationLogRepository.save.mockResolvedValue(
        {} as NotificationLog,
      );

      await scheduler.recover(startDate, endDate);

      expect(mockWebhookService.sendBirthdayMessage).toHaveBeenCalledWith(
        'John',
        'Doe',
      );
      expect(mockNotificationLogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          type: 'birthday',
          scheduledFor: missedUser.nextBirthdayUtc,
          status: 'sent',
        }),
      );
    });

    it('should skip user if notification already sent', async () => {
      const missedUser: Partial<User> = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        nextBirthdayUtc: new Date('2025-01-01T09:00:00Z'),
      };

      const sentLog: Partial<NotificationLog> = {
        id: 1,
        userId: 1,
        scheduledFor: new Date('2025-01-01T09:00:00Z'),
        status: 'sent',
      };

      mockUsersRepository.find.mockResolvedValue([missedUser as User]);
      mockNotificationLogRepository.find.mockResolvedValue([
        sentLog as NotificationLog,
      ]);

      await scheduler.recover(startDate, endDate);

      expect(mockWebhookService.sendBirthdayMessage).not.toHaveBeenCalled();
      expect(mockNotificationLogRepository.save).not.toHaveBeenCalled();
    });

    it('should handle multiple users with mixed states', async () => {
      const user1: Partial<User> = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        nextBirthdayUtc: new Date('2025-01-01T09:00:00Z'),
      };

      const user2: Partial<User> = {
        id: 2,
        firstName: 'Jane',
        lastName: 'Smith',
        nextBirthdayUtc: new Date('2025-01-01T10:00:00Z'),
      };

      const sentLog: Partial<NotificationLog> = {
        id: 1,
        userId: 1,
        scheduledFor: new Date('2025-01-01T09:00:00Z'),
        status: 'sent',
      };

      mockUsersRepository.find.mockResolvedValue([
        user1 as User,
        user2 as User,
      ]);
      mockNotificationLogRepository.find.mockResolvedValue([
        sentLog as NotificationLog,
      ]);
      mockWebhookService.sendBirthdayMessage.mockResolvedValue(undefined);
      mockNotificationLogRepository.save.mockResolvedValue(
        {} as NotificationLog,
      );

      await scheduler.recover(startDate, endDate);

      expect(mockWebhookService.sendBirthdayMessage).toHaveBeenCalledTimes(1);
      expect(mockWebhookService.sendBirthdayMessage).toHaveBeenCalledWith(
        'Jane',
        'Smith',
      );
      expect(mockNotificationLogRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should continue processing other users if one fails', async () => {
      const user1: Partial<User> = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        nextBirthdayUtc: new Date('2025-01-01T09:00:00Z'),
      };

      const user2: Partial<User> = {
        id: 2,
        firstName: 'Jane',
        lastName: 'Smith',
        nextBirthdayUtc: new Date('2025-01-01T10:00:00Z'),
      };

      mockUsersRepository.find.mockResolvedValue([
        user1 as User,
        user2 as User,
      ]);
      mockNotificationLogRepository.find.mockResolvedValue([]);
      mockWebhookService.sendBirthdayMessage
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);
      mockNotificationLogRepository.save.mockResolvedValue(
        {} as NotificationLog,
      );

      await scheduler.recover(startDate, endDate);

      expect(mockWebhookService.sendBirthdayMessage).toHaveBeenCalledTimes(2);
      expect(mockNotificationLogRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should optimize queries by fetching logs in bulk', async () => {
      const users = [
        {
          id: 1,
          firstName: 'User1',
          lastName: 'Test',
          nextBirthdayUtc: new Date('2025-01-01T09:00:00Z'),
        },
        {
          id: 2,
          firstName: 'User2',
          lastName: 'Test',
          nextBirthdayUtc: new Date('2025-01-01T10:00:00Z'),
        },
        {
          id: 3,
          firstName: 'User3',
          lastName: 'Test',
          nextBirthdayUtc: new Date('2025-01-01T11:00:00Z'),
        },
      ];

      mockUsersRepository.find.mockResolvedValue(users as User[]);
      mockNotificationLogRepository.find.mockResolvedValue([]);
      mockWebhookService.sendBirthdayMessage.mockResolvedValue(undefined);
      mockNotificationLogRepository.save.mockResolvedValue(
        {} as NotificationLog,
      );

      await scheduler.recover(startDate, endDate);

      expect(mockUsersRepository.find).toHaveBeenCalledTimes(1);
      expect(mockNotificationLogRepository.find).toHaveBeenCalledTimes(1);
      expect(mockWebhookService.sendBirthdayMessage).toHaveBeenCalledTimes(3);
    });
  });
});
