import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { Counter, Histogram } from "prom-client";
import { TransactionsRepository } from "./transactions.repository";
import { CategoriesRepository } from "../categories/categories.repository";
import {
  CreateTransactionDto,
  UpdateTransactionDto,
} from "./dto/transaction.dto";
import {
  GetTransactionsQueryDto,
  GetTransactionSummaryQueryDto,
} from "./dto/get-transactions-query.dto";
import { AppError } from "@shared/errors/AppError";
import { ERROR_CODES } from "@shared/errors/errorCodes";
import { TRANSACTION_METRICS } from "../metrics/transaction-metrics";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import { EventPublisher } from "@shared/events/event.publisher";

@Injectable()
export class TransactionsService {
  private readonly transactionsCreated: Counter<string>;
  private readonly transactionsUpdated: Counter<string>;
  private readonly transactionsDeleted: Counter<string>;
  private readonly transactionsRead: Counter<string>;
  private readonly queryDuration: Histogram<string>;

  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly eventPublisher: EventPublisher,
  ) {
    this.transactionsCreated = TRANSACTION_METRICS.transactionsCreated;
    this.transactionsUpdated = TRANSACTION_METRICS.transactionsUpdated;
    this.transactionsDeleted = TRANSACTION_METRICS.transactionsDeleted;
    this.transactionsRead = TRANSACTION_METRICS.transactionsRead;
    this.queryDuration = TRANSACTION_METRICS.queryDuration;
  }

  async create(user_id: string, dto: CreateTransactionDto) {
    const category = await this.categoriesRepository.findById(
      dto.category_id,
      user_id,
    );
    if (!category) {
      throw new AppError("Category not found", ERROR_CODES.VALIDATION_ERROR, {
        field: "category_id",
      });
    }
    if (category.type !== dto.type) {
      throw new AppError(
        `Category type "${category.type}" does not match transaction type "${dto.type}"`,
        ERROR_CODES.VALIDATION_ERROR,
        { field: "category_id" },
      );
    }

    const transaction = await this.transactionsRepository.create(user_id, dto);
    this.transactionsCreated.inc({ type: dto.type });
    this.emitTransactionEvent("transaction.created", transaction, user_id, category);
    return transaction;
  }

  async findAll(user_id: string, queryDto: GetTransactionsQueryDto) {
    const end = this.queryDuration.startTimer();
    const result = await this.transactionsRepository.findAll(user_id, queryDto);
    end({ method: "findAll" });
    this.transactionsRead.inc(result.data.length);
    return result;
  }

  async findOne(id: string, user_id: string) {
    const end = this.queryDuration.startTimer();
    const transaction = await this.transactionsRepository.findById(id, user_id);
    if (!transaction) {
      throw new AppError("Transaction not found", ERROR_CODES.NOT_FOUND);
    }
    end({ method: "findOne" });
    this.transactionsRead.inc();
    return transaction;
  }

  async update(id: string, user_id: string, dto: UpdateTransactionDto) {
    const existingTransaction = await this.transactionsRepository.findById(
      id,
      user_id,
    );
    if (!existingTransaction) {
      throw new AppError("Transaction not found", ERROR_CODES.NOT_FOUND);
    }

    if (dto.category_id) {
      const category = await this.categoriesRepository.findById(
        dto.category_id,
        user_id,
      );
      if (!category) {
        throw new AppError("Category not found", ERROR_CODES.VALIDATION_ERROR, {
          field: "category_id",
        });
      }
      const transactionType = dto.type || existingTransaction.type;
      if (category.type !== transactionType) {
        throw new AppError(
          `Category type "${category.type}" does not match transaction type "${transactionType}"`,
          ERROR_CODES.VALIDATION_ERROR,
          { field: "category_id" },
        );
      }
    }

    const updatedTransaction = await this.transactionsRepository.update(
      id,
      user_id,
      dto,
    );
    this.transactionsUpdated.inc({ type: updatedTransaction.type });
    
    // category object is only available if dto.category_id is provided
    let updatedCategory;
    if (dto.category_id) {
       updatedCategory = await this.categoriesRepository.findById(dto.category_id, user_id);
    }
    
    this.emitTransactionEvent("transaction.updated", updatedTransaction, user_id, updatedCategory);
    return updatedTransaction;
  }

  async remove(id: string, user_id: string) {
    const transaction = await this.transactionsRepository.findById(id, user_id);
    if (!transaction) {
      throw new AppError("Transaction not found", ERROR_CODES.NOT_FOUND);
    }

    const success = await this.transactionsRepository.delete(id, user_id);
    if (success) {
      this.transactionsDeleted.inc({ type: transaction.type });
      this.eventPublisher.publish("transaction.deleted", { id, user_id }, "transaction-service").catch(err => console.error(err));
    }
    return { success };
  }

  async getHistory(user_id: string) {
    const end = this.queryDuration.startTimer();
    const history = await this.transactionsRepository.getHistory(user_id);
    end({ method: "getHistory" });
    return history;
  }

  async getSummary(user_id: string, queryDto: GetTransactionSummaryQueryDto) {
    const end = this.queryDuration.startTimer();
    const summary = await this.transactionsRepository.getSummary(
      user_id,
      queryDto,
    );
    end({ method: "getSummary" });
    return summary;
  }

  private emitTransactionEvent(event: string, transaction: any, user_id: string, category?: any) {
    const baseUrl = this.configService.get<string>("FINANCE_INTELLIGENCE_URL") || "http://finance-intelligence:3006";
    const url = `${baseUrl}/events/transactions`;
    const event_id = crypto.randomUUID();
    const payload = {
      event_id,
      event,
      data: {
        transaction_id: transaction.id,
        user_id,
        amount: transaction.amount,
        type: transaction.type,
        category: category?.name || transaction.category_name || "unknown",
        timestamp: transaction.transaction_date,
      }
    };

    // Log the event to app_common.event_logs
    this.eventPublisher.publish(
      event, 
      payload,
      "transaction-service"
    ).catch(err => console.error(err));

    this.httpService.post(url, payload).subscribe({
      next: () => {},
      error: (err) => {
        // Just log the error, don't fail the transaction creation
        console.error(`Failed to emit ${event} to finance-intelligence:`, err.message);
      }
    });
  }
}
