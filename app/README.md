# 에브리케어 답례품 주문관리 시스템

홈페이지에서 결제를 마친 고객이 답례품 주문서(라벨 디자인, 이름, 색상, 배송지)를
작성하고, 이후 배송현황을 확인할 수 있는 시스템입니다. 관리자는 제출된 주문을
목록/상세에서 관리하고, 스프레드시트 붙여넣기용 표를 통해 기존 시트 작업을
이어갈 수 있습니다.

## 로컬에서 실행해보기

```bash
npm install
npm run dev
```

`.env.local`에 `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`만 설정하면
Supabase 없이 `.data/orders.json` 파일을 DB처럼 사용하며 바로 테스트할 수 있습니다.
(`.env.example` 참고)

- 고객 페이지: http://localhost:3000
- 관리자 페이지: http://localhost:3000/admin (`.env.local`에 설정한 비밀번호로 로그인)

## 운영 배포 (Vercel + Supabase)

### 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 생성합니다.
2. 프로젝트의 **SQL Editor**를 열고 `supabase/schema.sql` 파일의 내용을 그대로 붙여넣어 실행합니다.
3. **Project Settings → API**에서 `Project URL`과 `service_role` 키(⚠️ `anon` 키 아님, 비공개로 관리)를 복사해둡니다.

### 2. Vercel 배포

1. 이 저장소를 GitHub에 올리고 Vercel에서 Import 합니다. (루트 디렉토리를 `app`으로 지정)
2. Vercel 프로젝트의 Environment Variables에 아래 값을 등록합니다.

   | 이름 | 값 |
   |---|---|
   | `ADMIN_PASSWORD` | 관리자 페이지 비밀번호 |
   | `ADMIN_SESSION_SECRET` | 임의의 긴 랜덤 문자열 (`openssl rand -hex 32`) |
   | `SUPABASE_URL` | 1번에서 복사한 Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | 1번에서 복사한 service_role 키 |

3. 배포하면 완료입니다. `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있으면
   자동으로 Supabase를 사용하고, 없으면 로컬 JSON 파일을 사용합니다 (`src/lib/db/index.ts`).

### 3. 도메인 연결 (선택)

Vercel 프로젝트 설정에서 원하는 도메인을 연결하면, 고객에게 안내할 주문서 링크가
`https://주문.everycare.co.kr/order/new` 같은 형태가 됩니다. 홈페이지 결제 완료
페이지나 안내 메시지에 이 링크를 걸어두면 됩니다.

## 홈페이지 결제 엑셀 매칭 (시트 내보내기 화면)

`/admin/export` 한 화면에서 결제 엑셀 업로드 → 주문서 자동 매칭 → 시트 복사까지 합니다.

- 엑셀을 올리면 결제 내역이 `payments` 테이블(로컬은 `.data/payments.json`)에 **누적** 저장됩니다.
  겹치는 기간의 엑셀을 다시 올려도 같은 결제(주문번호·연락처·상품·금액이 같은 줄)는 한 번만 저장되고,
  취소/환불된 줄은 제외(이전에 저장된 결제면 삭제)됩니다.
- 연락처가 같은 주문서가 1건이면 자동 연결되어 품목명/금액/배송메모가 비어 있는 주문서에 채워집니다
  (이미 값이 있으면 덮어쓰지 않음). 연락처가 같은 주문서가 여러 건이면 화면에서 직접 연결합니다.
- 표 맨 오른쪽 "기타(확인사항)"에 문제가 자동 표시됩니다: 결제X 주문서O, 결제O 주문서X,
  타올 10단위 X / 20개 미만, 옵션 수량 X(옵션 구간과 수량 불일치), 엑셀 금액과 다름, 연락처 중복.
- 정렬: 체험 패키지(품목명에 `[체험]`)가 항상 맨 위, 그 안/나머지는 발송일이 빠른 순.
- 타올 "미포함"이면 타올색상은 빈칸으로 나갑니다.

Supabase를 쓰는 경우 `supabase/schema.sql` 맨 아래 `payments` 테이블 SQL을 한 번 실행해야 합니다.

## 카카오 로그인 추가하기 (추후)

현재는 고객 인증을 카카오 로그인 대신 "주문 완료 시 발급되는 고유 링크"로
처리합니다 (`order_code`, `src/lib/codes.ts`). 이후 카카오 로그인을 추가하려면:

1. [Kakao Developers](https://developers.kakao.com)에서 앱을 등록하고 REST API 키를 발급받습니다.
2. Supabase Auth의 Kakao Provider를 활성화하거나, NextAuth의 Kakao Provider를 도입합니다.
3. `orders` 테이블에 `user_id` 컬럼을 추가하고, 주문 생성/조회 시 로그인한 사용자와
   연결하도록 `src/lib/db/*.ts`를 수정합니다.

기존의 "고유 링크" 방식은 카카오 로그인 도입 후에도 링크 분실 시 대체 수단으로
유지해도 무방합니다.

## 롯데택배 송장 등록

`/admin/orders/[id]`에서 택배사/송장번호를 입력하고 상태를 "발송완료"로 바꾸면,
고객 페이지(`/order/[orderCode]`)에 택배사·송장번호와 함께 롯데글로벌로지스
배송조회 링크가 자동으로 표시됩니다. 롯데택배 오픈API로 송장을 자동 등록하려면
별도의 API 계약이 필요하며, 현재는 수기 입력 방식입니다.

## 프로젝트 구조

- `src/lib/orderRules.ts` — 라벨 디자인(A~F)별 필요 항목 정의
- `src/lib/exportRows.ts` — 시트 행 구성(매칭 상태, 확인사항, 정렬)
- `src/lib/reconcile.ts` — 결제 ↔ 주문서 자동 연결
- `src/lib/exportDefaults.ts` — 스프레드시트 출력값 기본 계산 규칙 (받는분성명 표시, 기타, 발송일 등)
- `src/lib/db/` — DB 어댑터 (로컬 JSON / Supabase 전환)
- `src/lib/actions/` — Server Actions (주문 생성, 조회, 관리자 로그인/수정)
- `src/app/order/*` — 고객용 주문서/조회 페이지
- `src/app/admin/*` — 관리자 페이지
- `src/proxy.ts` — `/admin/*` 경로 비밀번호 보호 (Next.js 16의 Proxy, 구 middleware)
