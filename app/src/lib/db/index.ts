import type { OrdersDB } from "./adapter";
import { localOrdersDB } from "./local";
import { supabaseOrdersDB } from "./supabase";

const useSupabase = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const db: OrdersDB = useSupabase ? supabaseOrdersDB : localOrdersDB;
