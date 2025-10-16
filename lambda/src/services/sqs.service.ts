import {
  SQSClient,
  SendMessageCommand,
  SendMessageBatchCommand,
  SendMessageBatchRequestEntry,
} from '@aws-sdk/client-sqs';
import { SQS_QUEUE_URL } from '../config/constants';

export interface NotificationMessage {
  notificationId: number;
  userId: number;
  firstName: string;
  lastName: string;
}

export class SQSService {
  private client: SQSClient;
  private queueUrl: string;

  constructor() {
    this.client = new SQSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.SQS_ENDPOINT_URL,
    });
    this.queueUrl = SQS_QUEUE_URL;
  }

  async publishNotification(message: NotificationMessage): Promise<void> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(message),
    });

    await this.client.send(command);
  }

  async publishNotificationBatch(
    messages: NotificationMessage[],
  ): Promise<void> {
    if (messages.length === 0) return;

    const chunks = this.chunkArray(messages, 10);

    for (const chunk of chunks) {
      const entries: SendMessageBatchRequestEntry[] = chunk.map(
        (msg, index) => ({
          Id: `${msg.notificationId}-${index}`,
          MessageBody: JSON.stringify(msg),
        }),
      );

      const command = new SendMessageBatchCommand({
        QueueUrl: this.queueUrl,
        Entries: entries,
      });

      await this.client.send(command);
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
