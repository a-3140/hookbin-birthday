import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1759950965701 implements MigrationInterface {
  name = 'Initial1759950965701';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user" ("id" SERIAL NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "birthDate" date NOT NULL, "location" character varying NOT NULL, "timezone" character varying NOT NULL, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "scheduled_notification" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "type" character varying(50) NOT NULL, "scheduledFor" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', CONSTRAINT "PK_0c7f6fe4bf988bd6fc01bee33bd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bb6339f8f4bf4956ee9d9e675f" ON "scheduled_notification" ("userId", "type") `,
    );
    await queryRunner.query(
      `ALTER TABLE "scheduled_notification" ADD CONSTRAINT "FK_a190616e0fd7a5a67d68f7b9c48" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "scheduled_notification" DROP CONSTRAINT "FK_a190616e0fd7a5a67d68f7b9c48"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bb6339f8f4bf4956ee9d9e675f"`,
    );
    await queryRunner.query(`DROP TABLE "scheduled_notification"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
