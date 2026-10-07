import type {
  NewOrderInput,
  NewPaymentInput,
  OrderFilter,
  OrderRecord,
  PaymentRecord,
} from "../types";

export interface OrdersDB {
  create(input: NewOrderInput): Promise<OrderRecord>;
  getByCode(orderCode: string): Promise<OrderRecord | null>;
  getById(id: string): Promise<OrderRecord | null>;
  findByNameAndPhoneTail(
    recipientName: string,
    phoneTail: string
  ): Promise<OrderRecord | null>;
  list(filter?: OrderFilter): Promise<OrderRecord[]>;
  update(id: string, patch: Partial<OrderRecord>): Promise<OrderRecord>;
  delete(id: string): Promise<void>;
}

export interface PaymentsDB {
  /** 오래된 순(created_at 오름차순)으로 전부 돌려준다. */
  list(): Promise<PaymentRecord[]>;
  /** dedupe_key가 이미 있는 건은 건너뛰고, 새로 저장된 건만 돌려준다. */
  insertMany(inputs: NewPaymentInput[]): Promise<PaymentRecord[]>;
  /** 해당 키의 결제를 지우고, 지워진 레코드를 돌려준다. */
  deleteByKeys(keys: string[]): Promise<PaymentRecord[]>;
  update(id: string, patch: Partial<PaymentRecord>): Promise<void>;
  delete(id: string): Promise<void>;
}
