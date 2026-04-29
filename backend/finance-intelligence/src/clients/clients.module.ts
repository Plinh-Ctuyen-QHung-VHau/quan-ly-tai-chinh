import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TransactionClient } from "./transaction.client";
import { BudgetNotificationClient } from "./budget-notification.client";
import { ApiGatewayClient } from "./api-gateway.client";

@Module({
  imports: [HttpModule],
  providers: [TransactionClient, BudgetNotificationClient, ApiGatewayClient],
  exports: [TransactionClient, BudgetNotificationClient, ApiGatewayClient],
})
export class ClientsModule {}
