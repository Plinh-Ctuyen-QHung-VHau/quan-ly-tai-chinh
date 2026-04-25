import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';
import { TransactionsRepository } from './transactions.repository';
import { CategoriesRepository } from '../categories/categories.repository';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';
import { GetTransactionsQueryDto, GetTransactionSummaryQueryDto } from './dto/get-transactions-query.dto';
import { AppError } from '../../../shared/errors/AppError';
import { ERROR_CODES } from '../../../shared/errors/errorCodes';
import { TRANSACTION_METRICS } from '../metrics/transaction-metrics';

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
  ) {
    this.transactionsCreated = TRANSACTION_METRICS.transactionsCreated;
    this.transactionsUpdated = TRANSACTION_METRICS.transactionsUpdated;
    this.transactionsDeleted = TRANSACTION_METRICS.transactionsDeleted;
    this.transactionsRead = TRANSACTION_METRICS.transactionsRead;
    this.queryDuration = TRANSACTION_METRICS.queryDuration;
  }

  async create(userId: string, dto: CreateTransactionDto) {
    const category = await this.categoriesRepository.findById(dto.categoryId, userId);
    if (!category) {
      throw new AppError('Category not found', ERROR_CODES.VALIDATION_ERROR, { field: 'categoryId' });
    }
    if (category.type !== dto.type) {
      throw new AppError(
        `Category type "${category.type}" does not match transaction type "${dto.type}"`,
        ERROR_CODES.VALIDATION_ERROR,
        { field: 'categoryId' }
      );
    }

    const transaction = await this.transactionsRepository.create(userId, dto);
    this.transactionsCreated.inc({ type: dto.type });
    // TODO: Publish 'transaction.created' event
    return transaction;
  }

  async findAll(userId: string, queryDto: GetTransactionsQueryDto) {
    const end = this.queryDuration.startTimer();
    const result = await this.transactionsRepository.findAll(userId, queryDto);
    end({ method: 'findAll' });
    this.transactionsRead.inc(result.data.length);
    return result;
  }

  async findOne(id: string, userId: string) {
    const end = this.queryDuration.startTimer();
    const transaction = await this.transactionsRepository.findById(id, userId);
    if (!transaction) {
      throw new AppError('Transaction not found', ERROR_CODES.NOT_FOUND);
    }
    end({ method: 'findOne' });
    this.transactionsRead.inc();
    return transaction;
  }

  async update(id: string, userId: string, dto: UpdateTransactionDto) {
    const existingTransaction = await this.transactionsRepository.findById(id, userId);
    if (!existingTransaction) {
      throw new AppError('Transaction not found', ERROR_CODES.NOT_FOUND);
    }

    if (dto.categoryId) {
        const category = await this.categoriesRepository.findById(dto.categoryId, userId);
        if (!category) {
            throw new AppError('Category not found', ERROR_CODES.VALIDATION_ERROR, { field: 'categoryId' });
        }
        const transactionType = dto.type || existingTransaction.type;
        if (category.type !== transactionType) {
            throw new AppError(
                `Category type "${category.type}" does not match transaction type "${transactionType}"`,
                ERROR_CODES.VALIDATION_ERROR,
                { field: 'categoryId' }
            );
        }
    }

    const updatedTransaction = await this.transactionsRepository.update(id, userId, dto);
    this.transactionsUpdated.inc({ type: updatedTransaction.type });
    // TODO: Publish 'transaction.updated' event
    return updatedTransaction;
  }

  async remove(id: string, userId: string) {
    const transaction = await this.transactionsRepository.findById(id, userId);
    if (!transaction) {
        throw new AppError('Transaction not found', ERROR_CODES.NOT_FOUND);
    }
    
    const success = await this.transactionsRepository.delete(id, userId);
    if (success) {
      this.transactionsDeleted.inc({ type: transaction.type });
      // TODO: Publish 'transaction.deleted' event
    }
    return { success };
  }

  async getHistory(userId: string) {
    const end = this.queryDuration.startTimer();
    const history = await this.transactionsRepository.getHistory(userId);
    end({ method: 'getHistory' });
    return history;
  }

  async getSummary(userId: string, queryDto: GetTransactionSummaryQueryDto) {
    const end = this.queryDuration.startTimer();
    const summary = await this.transactionsRepository.getSummary(userId, queryDto);
    end({ method: 'getSummary' });
    return summary;
  }
}
