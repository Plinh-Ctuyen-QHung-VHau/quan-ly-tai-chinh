import { Module } from "@nestjs/common";
import { Pool } from "pg";
import { ConfigService } from "@nestjs/config";

export const PG_CONNECTION = "PG_CONNECTION";

@Module({
  providers: [
    {
      provide: PG_CONNECTION,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const pool = new Pool({
          connectionString: configService.get<string>("database.url"),
        });
        await pool.query("SELECT NOW()");
        return pool;
      },
    },
  ],
  exports: [PG_CONNECTION],
})
export class DatabaseModule {}
