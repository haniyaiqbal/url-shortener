import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1795096502431 implements MigrationInterface {
  name = 'InitialSchema1795096502431';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying(320) NOT NULL,
                "password_hash" text NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email")
        `);
    await queryRunner.query(`
            CREATE TABLE "links" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "code" character varying(32) NOT NULL,
                "target_url" text NOT NULL,
                "user_id" uuid NOT NULL,
                "click_count" integer NOT NULL DEFAULT '0',
                "expires_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ecf17f4a741d3c5ba0b4c5ab4b6" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_52a3fa2a2c27a987ed58fd2ea4" ON "links" ("code")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_9f8dea86e48a7216c4f5369c1e" ON "links" ("user_id")
        `);
    await queryRunner.query(`
            CREATE TABLE "clicks" (
                "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
                "link_id" uuid NOT NULL,
                "clicked_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "referrer" character varying(255),
                "device" character varying(16) NOT NULL,
                CONSTRAINT "PK_7765d7ffdeb0ed2675651020814" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_1d95ff2a503fc157f14821f650" ON "clicks" ("link_id", "clicked_at")
        `);
    await queryRunner.query(`
            ALTER TABLE "links"
            ADD CONSTRAINT "FK_9f8dea86e48a7216c4f5369c1e4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "clicks"
            ADD CONSTRAINT "FK_3e477bfbdf3a572363b65bc4525" FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "clicks" DROP CONSTRAINT "FK_3e477bfbdf3a572363b65bc4525"
        `);
    await queryRunner.query(`
            ALTER TABLE "links" DROP CONSTRAINT "FK_9f8dea86e48a7216c4f5369c1e4"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_1d95ff2a503fc157f14821f650"
        `);
    await queryRunner.query(`
            DROP TABLE "clicks"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_9f8dea86e48a7216c4f5369c1e"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_52a3fa2a2c27a987ed58fd2ea4"
        `);
    await queryRunner.query(`
            DROP TABLE "links"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"
        `);
    await queryRunner.query(`
            DROP TABLE "users"
        `);
  }
}
