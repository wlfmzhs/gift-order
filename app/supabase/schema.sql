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
  embroidery_color text,

  recipient_name text not null,
  recipient_phone text not null,
  recipient_zipcode text,
  recipient_address1 text not null,
  recipient_address2 text,

  status text not null default '접수완료'
    check (status in ('접수완료','확인중','발송준비','발송완료')),
  carrier text not null default '롯데택배',
  tracking_no text,
  ship_date date,

  export_recipient_display text not null default '',
  export_item_name text not null default '',
  export_amount text not null default '',
  export_delivery_message text not null default '',
  export_birthday text not null default '',
  export_etc text not null default ''
);

create index if not exists orders_order_code_idx on orders (order_code);
create index if not exists orders_recipient_name_idx on orders (recipient_name);
create index if not exists orders_status_idx on orders (status);

-- 모든 접근은 Next.js 서버(API/Server Action)에서 서비스 롤 키로만 이루어진다.
-- RLS를 켜두되 별도 정책을 추가하지 않으면 anon/authenticated 키로는 아무 것도
-- 조회/변경할 수 없고, 서비스 롤 키만 우회하여 접근 가능하다.
alter table orders enable row level security;
