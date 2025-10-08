import { DataSource } from 'typeorm';
import { User, ScheduledNotification } from '@shared/entities';
import {
  DB_HOST,
  DB_PORT,
  DB_USERNAME,
  DB_PASSWORD,
  DB_DATABASE,
} from '../config/constants';

export class DatabaseService {
  private static instance: DatabaseService;
  private static initPromise: Promise<DatabaseService> | null = null;
  private dataSource: DataSource;

  private constructor() {
    this.dataSource = new DataSource({
      type: 'postgres',
      host: DB_HOST,
      port: DB_PORT,
      username: DB_USERNAME,
      password: DB_PASSWORD,
      database: DB_DATABASE,
      entities: [User, ScheduledNotification],
      synchronize: false,
      logging: false,
    });
  }

  static async getInstance(): Promise<DatabaseService> {
    if (!DatabaseService.initPromise) {
      DatabaseService.initPromise = (async () => {
        if (!DatabaseService.instance) {
          DatabaseService.instance = new DatabaseService();
          await DatabaseService.instance.dataSource.initialize();
        }
        return DatabaseService.instance;
      })();
    }
    return DatabaseService.initPromise;
  }

  getDataSource() {
    if (!this.dataSource?.isInitialized) {
      throw new Error('Database not initialized');
    }
    return this.dataSource;
  }

  getUserRepository() {
    return this.getDataSource().getRepository(User);
  }

  getScheduledNotificationRepository() {
    return this.getDataSource().getRepository(ScheduledNotification);
  }
}
