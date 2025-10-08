import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1759852593439 implements MigrationInterface {
  name = 'Initial1759852593439';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user" ("id" SERIAL NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "birthDate" DATE NOT NULL, "location" character varying NOT NULL, "timezone" character varying NOT NULL, "nextBirthdayUtc" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "scheduled_notification" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "type" character varying NOT NULL, "scheduledFor" TIMESTAMP WITH TIME ZONE NOT NULL, "sentAt" TIMESTAMP WITH TIME ZONE, "status" character varying NOT NULL DEFAULT 'sent', CONSTRAINT "PK_6f761cfbbd064e0f326960877d6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_174181fd0265fda9db1e1ae0e0" ON "scheduled_notification" ("userId", "type", "scheduledFor") `,
    );
    await queryRunner.query(
      `ALTER TABLE "scheduled_notification" ADD CONSTRAINT "FK_2f40110b0e8bd7f9e6ec23c930d" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "scheduled_notification" DROP CONSTRAINT "FK_2f40110b0e8bd7f9e6ec23c930d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_174181fd0265fda9db1e1ae0e0"`,
    );
    await queryRunner.query(`DROP TABLE "scheduled_notification"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
