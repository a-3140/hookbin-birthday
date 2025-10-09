import 'reflect-metadata';
import { NotificationService, BirthdayService } from './services';
import { FIFTEEN_MINUTES } from './constants/time';

interface LambdaResponse {
  statusCode: number;
  body: string;
}

export const handler = async (): Promise<LambdaResponse> => {
  console.log('Birthday processor triggered at:', new Date().toISOString());

  const birthdayService = new BirthdayService();
  const notificationService = new NotificationService();

  await birthdayService.init();
  await notificationService.init();

  const now = new Date();
  const from15MinAgo = new Date(now.getTime() - FIFTEEN_MINUTES);

  console.log(
    `Checking for birthdays between ${from15MinAgo.toISOString()} and ${now.toISOString()}`,
  );

  const notifications =
    await birthdayService.getPendingNotifications(from15MinAgo, now);

  console.log(`Found ${notifications.length} pending birthday notifications`);

  if (notifications.length === 0) {
    return { statusCode: 200, body: JSON.stringify({ processed: 0 }) };
  }

  for (const notification of notifications) {
    try {
      await notificationService.sendBirthdayMessage(
        notification.user.firstName,
        notification.user.lastName,
      );

      console.log(
        `Birthday message sent for user ${notification.user.id} (notification ${notification.id})`,
      );

      await notificationService.updateNotificationStatus(notification.id, 'sent');
    } catch (error) {
      console.error(
        `Failed to process notification ${notification.id}:`,
        error,
      );
      await notificationService.updateNotificationStatus(notification.id, 'failed');
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ processed: notifications.length }),
  };
};
