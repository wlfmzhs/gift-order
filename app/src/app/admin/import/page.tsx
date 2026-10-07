import { redirect } from "next/navigation";

// 엑셀 매칭은 시트 내보내기 화면으로 합쳐졌다. 예전 주소로 들어와도 그쪽으로 보낸다.
export default function AdminImportPage() {
  redirect("/admin/export");
}
