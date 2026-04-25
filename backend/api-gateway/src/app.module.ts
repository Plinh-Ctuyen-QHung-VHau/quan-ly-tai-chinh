import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
import { HttpModule } from "@nestjs/axios";

import { HealthController } from "./health/health.controller";
import { MetricsController } from "./metrics/metrics.controller";
import { ProxyController } from "./proxy/proxy.controller";
import { ProxyService } from "./proxy/proxy.service";
import { configModuleOptions } from "./config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("supabase.jwtSecret"),
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>("rateLimit.ttl"),
          limit: config.get<number>("rateLimit.limit"),
        },
      ],
    }),
    HttpModule,
  ],
  controllers: [HealthController, MetricsController, ProxyController],
  providers: [ProxyService],
})
export class AppModule {}
