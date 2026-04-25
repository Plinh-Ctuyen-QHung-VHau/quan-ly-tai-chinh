import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadEnv } from "../../shared/config/envLoader";

async function bootstrap() {
  loadEnv();
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT || 3001);
}
bootstrap();
