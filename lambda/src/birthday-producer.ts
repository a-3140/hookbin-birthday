import 'reflect-metadata';
import { BirthdayService, SQSService } from './services';
import { FIFTEEN_MINUTES } from './constants/time';
import { NotificationMessage } from './services/sqs.service';

interface LambdaResponse {
  statusCode: number;
  body: string;
}

const BATCH_SIZE = 100;

export const handler = async (): Promise<LambdaResponse> => {
  console.log('Birthday producer triggered at:', new Date().toISOString());

  const birthdayService = new BirthdayService();
  const sqsService = new SQSService();

  await birthdayService.init();

  const now = new Date();
  const from15MinAgo = new Date(now.getTime() - FIFTEEN_MINUTES);

  console.log(
    `Checking for birthdays between ${from15MinAgo.toISOString()} and ${now.toISOString()}`,
  );

  const notifications = await birthdayService.getPendingNotifications(
    from15MinAgo,
    now,
  );

  console.log(`Found ${notifications.length} pending birthday notifications`);

  if (notifications.length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({ published: 0 }),
    };
  }

  await birthdayService.markAsProcessing(notifications.map((n) => n.id));

  const messages: NotificationMessage[] = notifications.map((notification) => ({
    notificationId: notification.id,
    userId: notification.user.id,
    firstName: notification.user.firstName,
    lastName: notification.user.lastName,
  }));

  let publishedCount = 0;

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      await sqsService.publishNotificationBatch(batch);
      publishedCount += batch.length;
      console.log(`Published batch of ${batch.length} messages to SQS`);
    } catch (error) {
      console.error(`Failed to publish batch starting at index ${i}:`, error);
    }
  }

  console.log(`Total messages published: ${publishedCount}`);

  return {
    statusCode: 200,
    body: JSON.stringify({ published: publishedCount }),
  };
};
