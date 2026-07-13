import {
  type CheckoutResponseDto,
  type RetakeResponseDto,
  type TransactionItemDto,
} from './payments.dto';
import { type CheckoutResult, type Transaction } from './payments.model';

/** Map a `POST /payments/checkout` response to the unified {@link CheckoutResult}. */
export function toCheckoutResult(dto: CheckoutResponseDto): CheckoutResult {
  if (dto.free) {
    return { status: 'enrolled', amount: dto.amount, currency: dto.currency };
  }
  return {
    status: 'redirect',
    checkoutUrl: dto.checkoutUrl,
    amount: dto.amount,
    currency: dto.currency,
    sessionId: dto.sessionId,
  };
}

/** Map a `POST /payments/retake` response to the unified {@link CheckoutResult}. */
export function toRetakeResult(dto: RetakeResponseDto): CheckoutResult {
  if (dto.free) {
    return { status: 'unlocked', amount: dto.amount, currency: dto.currency };
  }
  return {
    status: 'redirect',
    checkoutUrl: dto.checkoutUrl,
    amount: dto.amount,
    currency: dto.currency,
    sessionId: dto.sessionId,
  };
}

/** Map a wire `TransactionItemDto` to the frontend `Transaction` model. */
export function toTransaction(dto: TransactionItemDto): Transaction {
  return {
    id: dto.transactionId,
    certId: dto.certId,
    amount: dto.amount,
    currency: dto.currency,
    status: dto.status,
    createdAt: dto.createdAt,
  };
}
