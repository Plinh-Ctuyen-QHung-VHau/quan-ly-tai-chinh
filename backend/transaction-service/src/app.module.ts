import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health/health.controller";
import { MetricsController } from "./metrics/metrics.controller";
import { configModuleOptions } from "./config/configuration";
import { SupabaseModule } from "./supabase/supabase.module";
import { CategoriesModule } from "./categories/categories.module";
import { TransactionsModule } from "./transactions/transactions.module";

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    SupabaseModule,
    CategoriesModule,
    TransactionsModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [],
})
export class AppModule { }
