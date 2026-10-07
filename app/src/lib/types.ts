export type LabelDesign = "A" | "B" | "C" | "D" | "E" | "F";

export type OrderStatus = "접수완료" | "발송완료";

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

// 홈페이지 결제 엑셀에서 가져온 결제 1건(상품 1줄). 엑셀을 올릴 때마다 누적 저장된다.
export interface PaymentRecord {
  id: string;
  created_at: string;
  dedupe_key: string; // 같은 결제가 겹치는 엑셀에 다시 들어와도 한 번만 저장되게 하는 키
  recipient_name: string;
  phone: string; // 엑셀 원본 표기
  phone_norm: string; // 숫자만(비교용)
  item_name: string;
  amount: string;
  delivery_message: string;
  option_note: string; // 옵션 구간/수량 문제 설명 ("" = 문제 없음)
  order_id: string | null; // 연결된 주문서
}

export type NewPaymentInput = Omit<PaymentRecord, "id" | "created_at">;

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
  "기타(확인사항)",
] as const;
