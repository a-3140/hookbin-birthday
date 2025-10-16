import { MigrationInterface, QueryRunner } from 'typeorm';

export class Scheduled1760615870135 implements MigrationInterface {
  name = 'Scheduled1760615870135';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "scheduled_notification" ADD "attempts" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1a03c4a267fda8670f8a98e35e" ON "scheduled_notification" ("scheduledFor", "status") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1a03c4a267fda8670f8a98e35e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scheduled_notification" DROP COLUMN "attempts"`,
    );
  }
}
