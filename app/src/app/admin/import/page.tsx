import AdminHeader from "@/components/AdminHeader";
import ImportClient from "@/components/ImportClient";

export default function AdminImportPage() {
  return (
    <>
      <AdminHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-5 py-8">
          <h1 className="text-lg font-semibold">엑셀 자동 매칭</h1>
          <p className="mt-1 text-sm text-muted">
            홈페이지 주문 엑셀을 올리면 연락처 기준으로 상세주문서와 자동으로 대조해 품목명/금액을
            채워줍니다.
          </p>
          <div className="mt-6">
            <ImportClient />
          </div>
        </div>
      </main>
    </>
  );
}
