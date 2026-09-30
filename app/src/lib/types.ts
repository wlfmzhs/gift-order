export type LabelDesign = "A" | "B" | "C" | "D" | "E" | "F";

export type OrderStatus = "접수완료" | "확인중" | "발송준비" | "발송완료";

export interface OrderRecord {
  id: string;
  order_code: string;
  created_at: string;
  updated_at: string;

  label_design: LabelDesign;
  event_date: string; // YYYY-MM-DD
  birthday_date: string | null; // YYYY-MM-DD, 아기 첫 돌 날짜

  baby_name_kr: string | null;
  baby_name_en: string | null;
  father_name: string | null;
  mother_name: string | null;

  groom_name_kr: string | null;
  groom_name_en: string | null;
  bride_name_kr: string | null;
  bride_name_en: string | null;

  towel_color: string | null;
  embroidery_color: string | null;

  recipient_name: string;
  recipient_phone: string;
  recipient_zipcode: string | null;
  recipient_address1: string;
  recipient_address2: string | null;

  status: OrderStatus;
  carrier: string;
  tracking_no: string | null;
  ship_date: string | null;

  export_recipient_display: string;
  export_item_name: string;
  export_amount: string;
  export_delivery_message: string;
  export_birthday: string;
  export_etc: string;
}

export type NewOrderInput = Omit<
  OrderRecord,
  | "id"
  | "order_code"
  | "created_at"
  | "updated_at"
  | "status"
  | "carrier"
  | "tracking_no"
  | "ship_date"
  | "export_recipient_display"
  | "export_item_name"
  | "export_amount"
  | "export_delivery_message"
  | "export_birthday"
  | "export_etc"
>;

export interface OrderFilter {
  status?: OrderStatus;
  labelDesign?: LabelDesign;
  search?: string;
}

export const EXPORT_COLUMNS = [
  "받는분성명",
  "받는분전화번호",
  "받는분주소",
  "품목명",
  "배송메세지1",
  "금액",
  "생일날짜",
  "발송일",
  "기타",
  "라벨타입",
  "타올색상",
  "자수색상",
] as const;
