-- everycare 답례품 주문관리 시스템 - Supabase 스키마
-- Supabase 프로젝트의 SQL Editor에서 그대로 실행하세요.

create extension if not exists pgcrypto;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  label_design text not null check (label_design in ('A','B','C','D','E','F')),
  event_date date not null,
  birthday_date date,

  baby_name_kr text,
  baby_name_en text,
  father_name text,
  mother_name text,

  groom_name_kr text,
  groom_name_en text,
  bride_name_kr text,
  bride_name_en text,

  towel_color text,
  towel_quantity integer,
  embroidery_color text,

  recipient_name text not null,
  recipient_phone text not null,
  recipient_zipcode text,
  recipient_address1 text not null,
  recipient_address2 text,

  status text not null default '접수완료'
    check (status in ('접수완료','발송완료')),
  carrier text not null default '롯데택배',
  tracking_no text,
  ship_date date,

  export_recipient_display text not null default '',
  export_item_name text not null default '',
  export_amount text not null default '',
  export_delivery_message text not null default '',
  export_birthday text not null default '',
  export_etc text not null default '',
  notes_ack text not null default ''
);

create index if not exists orders_order_code_idx on orders (order_code);
create index if not exists orders_recipient_name_idx on orders (recipient_name);
create index if not exists orders_status_idx on orders (status);

-- 모든 접근은 Next.js 서버(API/Server Action)에서 서비스 롤 키로만 이루어진다.
-- RLS를 켜두되 별도 정책을 추가하지 않으면 anon/authenticated 키로는 아무 것도
-- 조회/변경할 수 없고, 서비스 롤 키만 우회하여 접근 가능하다.
alter table orders enable row level security;

-- 홈페이지 결제 엑셀에서 가져온 결제 내역 (엑셀을 올릴 때마다 누적 저장)
-- 이미 위 내용을 실행해 둔 프로젝트라면 아래 부분만 SQL Editor에서 추가로 실행하세요.
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  dedupe_key text unique not null,
  recipient_name text not null default '',
  phone text not null default '',
  phone_norm text not null default '',
  item_name text not null default '',
  amount text not null default '',
  delivery_message text not null default '',
  option_note text not null default '',
  order_id uuid references orders(id) on delete set null,
  ignored boolean not null default false
);

create index if not exists payments_phone_norm_idx on payments (phone_norm);
create index if not exists payments_order_id_idx on payments (order_id);

alter table payments enable row level security;

-- payments 테이블을 이미 만들어 두었다면(위 create 구문을 먼저 실행한 경우) 아래 한 줄만 추가로 실행하세요.
-- 시트 내보내기 화면에서 결제 내역을 삭제(숨김)하는 기능에 필요합니다.
alter table payments add column if not exists ignored boolean not null default false;
notify pgrst, 'reload schema';

-- 주문서의 "타올 구매 수량" 입력 기능에 필요합니다. orders 테이블을 이미 만들어 두었다면 아래 한 줄을 실행하세요.
alter table orders add column if not exists towel_quantity integer;
notify pgrst, 'reload schema';

-- 시트 화면의 "확인완료" 표시 기능에 필요합니다. orders 테이블을 이미 만들어 두었다면 아래 한 줄을 실행하세요.
alter table orders add column if not exists notes_ack text not null default '';
notify pgrst, 'reload schema';
