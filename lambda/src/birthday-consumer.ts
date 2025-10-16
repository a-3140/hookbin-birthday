import 'reflect-metadata';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { NotificationService } from './services';
import { NotificationMessage } from './services/sqs.service';

interface LambdaResponse {
  statusCode: number;
  body: string;
}

export const handler = async (event: SQSEvent): Promise<LambdaResponse> => {
  console.log('Birthday consumer triggered at:', new Date().toISOString());
  console.log(`Processing ${event.Records.length} messages from SQS`);

  const notificationService = new NotificationService();
  await notificationService.init();

  let successCount = 0;
  let failureCount = 0;

  for (const record of event.Records) {
    const success = await processRecord(record, notificationService);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log(
    `Processing complete: ${successCount} succeeded, ${failureCount} failed`,
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      processed: event.Records.length,
      succeeded: successCount,
      failed: failureCount,
    }),
  };
};

async function processRecord(
  record: SQSRecord,
  notificationService: NotificationService,
): Promise<boolean> {
  try {
    const message = JSON.parse(record.body) as NotificationMessage;
    console.log(
      `Processing notification ${message.notificationId} for user ${message.userId}`,
    );

    await notificationService.sendBirthdayMessage(
      message.firstName,
      message.lastName,
    );

    await notificationService.updateNotificationStatus(
      message.notificationId,
      'sent',
    );

    console.log(
      `Birthday message sent for user ${message.userId} (notification ${message.notificationId})`,
    );

    return true;
  } catch (error) {
    console.error(`Failed to process record:`, error);

    try {
      const message = JSON.parse(record.body) as NotificationMessage;
      await notificationService.incrementAttempts(message.notificationId);

      const attempts = await notificationService.getAttempts(
        message.notificationId,
      );
      if (attempts >= 3) {
        await notificationService.updateNotificationStatus(
          message.notificationId,
          'failed',
        );
        console.log(
          `Notification ${message.notificationId} marked as failed after ${attempts} attempts`,
        );
      }
    } catch (updateError) {
      console.error(`Failed to update notification status:`, updateError);
    }

    return false;
  }
}
