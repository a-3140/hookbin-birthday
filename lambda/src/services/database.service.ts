import { DataSource } from 'typeorm';
import { User, NotificationLog } from '@shared/entities';

export class DatabaseService {
  private static instance: DatabaseService;
  private static initPromise: Promise<DatabaseService> | null = null;
  private dataSource: DataSource;

  private constructor() {
    this.dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [User, NotificationLog],
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

  getNotificationLogRepository() {
    return this.getDataSource().getRepository(NotificationLog);
  }
}
