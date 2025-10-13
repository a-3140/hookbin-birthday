import { BirthdayService } from './birthday.service';
import { DatabaseService } from './database.service';
import { ScheduledNotification, User } from '@shared/entities';
import { Repository, Between } from 'typeorm';

jest.mock('./database.service');

describe('BirthdayService', () => {
  let service: BirthdayService;
  let mockScheduledNotificationRepo: jest.Mocked<
    Repository<ScheduledNotification>
  >;

  beforeEach(async () => {
    mockScheduledNotificationRepo = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<ScheduledNotification>>;

    const mockDbService = {
      getScheduledNotificationRepository: jest
        .fn()
        .mockReturnValue(mockScheduledNotificationRepo),
    };

    (DatabaseService.getInstance as jest.Mock).mockResolvedValue(mockDbService);

    service = new BirthdayService();
    await service.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPendingNotifications', () => {
    it('fetches pending notifications in date range with user relation', async () => {
      const from = new Date('2025-01-01T09:00:00Z');
      const to = new Date('2025-01-01T10:00:00Z');

      const user: Partial<User> = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: new Date('1990-12-25'),
        timezone: 'Australia/Sydney',
        location: 'Sydney',
      };

      const notification: Partial<ScheduledNotification> = {
        id: 1,
        userId: 1,
        type: 'birthday',
        scheduledFor: new Date('2025-01-01T09:30:00Z'),
        status: 'pending',
        user: user as User,
      };

      const findSpy = jest
        .spyOn(mockScheduledNotificationRepo, 'find')
        .mockResolvedValue([notification as ScheduledNotification]);

      const result = await service.getPendingNotifications(from, to);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(notification);
      expect(findSpy).toHaveBeenCalledWith({
        where: {
          scheduledFor: Between(from, to),
          status: 'pending',
        },
        relations: ['user'],
      });
    });
  });
});
