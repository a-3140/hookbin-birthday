import { Module } from '@nestjs/common';
import { UsersService } from './services';
import { UsersController } from './controllers';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, ScheduledNotification } from '@shared/entities';

@Module({
  imports: [TypeOrmModule.forFeature([User, ScheduledNotification])],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
