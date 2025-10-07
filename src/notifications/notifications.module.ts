import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { NotificationLog } from './entities';
import { User } from '../users/entities';
import { WebhookService } from './services';
import { RecoveryScheduler } from './schedulers';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationLog, User]),
    ScheduleModule.forRoot(),
    HttpModule,
  ],
  providers: [WebhookService, RecoveryScheduler],
  exports: [WebhookService],
})
export class NotificationsModule {}
