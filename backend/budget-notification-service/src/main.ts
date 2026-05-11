import { webcrypto } from "crypto";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadEnv } from "@shared/config/envLoader";

if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

async function bootstrap() {
  loadEnv();
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT || 3004);
}
bootstrap();
