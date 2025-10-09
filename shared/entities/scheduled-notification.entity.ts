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
@Index(['userId', 'type'], { unique: true })
export class ScheduledNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'timestamptz' })
  scheduledFor: Date;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;
}
