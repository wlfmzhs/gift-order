import type { OrdersDB, PaymentsDB } from "./adapter";
import { localOrdersDB, localPaymentsDB } from "./local";
import { supabaseOrdersDB, supabasePaymentsDB } from "./supabase";

const useSupabase = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const db: OrdersDB = useSupabase ? supabaseOrdersDB : localOrdersDB;
export const paymentsDb: PaymentsDB = useSupabase
  ? supabasePaymentsDB
  : localPaymentsDB;
