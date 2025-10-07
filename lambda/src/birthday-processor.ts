import { Handler } from 'aws-lambda';
import 'reflect-metadata';
import { NotificationService, BirthdayService } from './services';
import { FIFTEEN_MINUTES } from './constants/time';

export const handler: Handler = async () => {
  console.log('Birthday processor triggered at:', new Date().toISOString());

  const birthdayService = new BirthdayService();
  const notificationService = new NotificationService();

  await birthdayService.init();
  await notificationService.init();

  const now = new Date();
  const in15Min = new Date(now.getTime() + FIFTEEN_MINUTES);

  console.log(
    `Checking for birthdays between ${now.toISOString()} and ${in15Min.toISOString()}`,
  );

  const users = await birthdayService.getUsersWithUpcomingBirthdays(
    now,
    in15Min,
  );

  console.log(`Found ${users.length} users with upcoming birthdays`);

  if (users.length === 0) {
    return { statusCode: 200, body: JSON.stringify({ processed: 0 }) };
  }

  const userIds = users.map((u) => u.id);
  const sentLogs =
    await notificationService.getAlreadySentNotifications(userIds);

  const sentUserIds = new Set(
    sentLogs.map((log) => `${log.userId}-${log.scheduledFor.getTime()}`),
  );

  for (const user of users) {
    const logKey = `${user.id}-${user.nextBirthdayUtc.getTime()}`;

    if (sentUserIds.has(logKey)) {
      console.log(`Skipping user ${user.id} - already sent`);
      continue;
    }

    try {
      await notificationService.sendBirthdayMessage(
        user.firstName,
        user.lastName,
      );

      console.log(`Birthday message sent for user ${user.id}`);

      await notificationService.logNotification(
        user.id,
        user.nextBirthdayUtc,
        'sent',
      );

      await birthdayService.updateUserNextBirthday(user);

      console.log(
        `Next birthday for user ${user.id}: ${user.nextBirthdayUtc.toISOString()}`,
      );
    } catch (error) {
      console.error(`Failed to process user ${user.id}:`, error);
      await notificationService.logNotification(
        user.id,
        user.nextBirthdayUtc,
        'failed',
      );
    }
  }

  return { statusCode: 200, body: JSON.stringify({ processed: users.length }) };
};
