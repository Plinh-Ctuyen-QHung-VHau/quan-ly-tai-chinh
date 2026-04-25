import { register, Counter, Histogram } from 'prom-client';

const transactionsCreated = new Counter({
  name: 'transactions_created_total',
  help: 'Total number of transactions created',
  labelNames: ['type'],
});

const transactionsUpdated = new Counter({
  name: 'transactions_updated_total',
  help: 'Total number of transactions updated',
  labelNames: ['type'],
});

const transactionsDeleted = new Counter({
  name: 'transactions_deleted_total',
  help: 'Total number of transactions deleted',
  labelNames: ['type'],
});

const transactionsRead = new Counter({
    name: 'transactions_read_total',
    help: 'Total number of transactions read',
});

const queryDuration = new Histogram({
  name: 'transaction_query_duration_seconds',
  help: 'Duration of transaction queries in seconds',
  labelNames: ['method'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

export const TRANSACTION_METRICS = {
    transactionsCreated,
    transactionsUpdated,
    transactionsDeleted,
    transactionsRead,
    queryDuration,
    register
}
