import type { NewOrderInput, OrderFilter, OrderRecord } from "../types";

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
