import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('scheduled_notification')
@Index(['userId', 'type', 'scheduledFor'], { unique: true })
export class ScheduledNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  type: 'birthday' | 'anniversary';

  @Column({ type: 'timestamptz' })
  scheduledFor: Date;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ default: 'sent' })
  status: 'sent' | 'failed';
}
