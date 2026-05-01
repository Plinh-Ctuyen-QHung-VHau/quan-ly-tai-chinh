import { Module } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";
import { ChatbotController } from "./chatbot.controller";
import { ChatRepository } from "./chat.repository";
import { NlpModule } from "../nlp/nlp.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { AnomalyModule } from "../anomaly/anomaly.module";
import { ClientsModule } from "../clients/clients.module";

import { SharedEventsModule } from "@shared/events/events.module";

@Module({
  imports: [NlpModule, AnalyticsModule, AnomalyModule, ClientsModule, SharedEventsModule],
  controllers: [ChatController, ChatbotController],
  providers: [ChatService, ChatRepository],
  exports: [ChatService],
})
export class ChatModule {}
