import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health/health.controller";
import { MetricsController } from "./metrics/metrics.controller";
import { configModuleOptions } from "./config/configuration";
import { SupabaseModule } from "./supabase/supabase.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    SupabaseModule,
    UsersModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [],
})
export class AppModule { }
