import { handler } from './birthday-processor';
import { BirthdayService } from './services/birthday.service';
import { NotificationService } from './services/notification.service';
import { ScheduledNotification, User } from '@shared/entities';

jest.mock('./services/birthday.service');
jest.mock('./services/notification.service');

describe('Birthday Processor', () => {
  let birthdayGetPendingSpy: jest.SpyInstance;
  let notificationSendSpy: jest.SpyInstance;
  let notificationUpdateStatusSpy: jest.SpyInstance;

  beforeEach(() => {
    birthdayGetPendingSpy = jest
      .spyOn(BirthdayService.prototype, 'getPendingNotifications')
      .mockResolvedValue([]);
    notificationSendSpy = jest
      .spyOn(NotificationService.prototype, 'sendBirthdayMessage')
      .mockResolvedValue(undefined);
    notificationUpdateStatusSpy = jest
      .spyOn(NotificationService.prototype, 'updateNotificationStatus')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handler', () => {
    it('processes pending notifications and sends birthday messages', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: new Date('1990-12-25'),
        timezone: 'Australia/Sydney',
        location: 'Sydney',
      };

      const mockNotification: Partial<ScheduledNotification> = {
        id: 1,
        userId: 1,
        type: 'birthday',
        scheduledFor: new Date('2025-12-25T14:00:00Z'),
        status: 'pending',
        user: mockUser as User,
      };

      birthdayGetPendingSpy.mockResolvedValue([
        mockNotification as ScheduledNotification,
      ]);

      const result = await handler();

      expect(notificationSendSpy).toHaveBeenCalledWith('John', 'Doe');
      expect(notificationUpdateStatusSpy).toHaveBeenCalledWith(1, 'sent');
      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify({ processed: 1 }),
      });
    });

    it('returns 0 processed when no pending notifications', async () => {
      birthdayGetPendingSpy.mockResolvedValue([]);

      const result = await handler();

      expect(notificationSendSpy).not.toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify({ processed: 0 }),
      });
    });

    it('marks notification as failed when sending fails', async () => {
      const mockUser: Partial<User> = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: new Date('1990-12-25'),
        timezone: 'Australia/Sydney',
        location: 'Sydney',
      };

      const mockNotification: Partial<ScheduledNotification> = {
        id: 1,
        userId: 1,
        type: 'birthday',
        scheduledFor: new Date('2025-12-25T14:00:00Z'),
        status: 'pending',
        user: mockUser as User,
      };

      birthdayGetPendingSpy.mockResolvedValue([
        mockNotification as ScheduledNotification,
      ]);
      notificationSendSpy.mockRejectedValue(new Error('Network error'));

      const result = await handler();

      expect(notificationSendSpy).toHaveBeenCalledWith('John', 'Doe');
      expect(notificationUpdateStatusSpy).toHaveBeenCalledWith(1, 'failed');
      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify({ processed: 1 }),
      });
    });
  });
});
