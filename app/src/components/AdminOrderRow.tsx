"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteOrderAction, updateOrderAction } from "@/lib/actions/admin";
import type { OrderRecord, OrderStatus } from "@/lib/types";

const STATUS_OPTIONS: OrderStatus[] = ["접수완료", "발송완료"];

export default function AdminOrderRow({ order }: { order: OrderRecord }) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [trackingNo, setTrackingNo] = useState(order.tracking_no ?? "");
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = () => {
    setMessage(null);
    const nextStatus = trackingNo.trim() !== "" ? "발송완료" : status;
    startTransition(async () => {
      const result = await updateOrderAction(order.id, {
        status: nextStatus,
        tracking_no: trackingNo,
      });
      if (result.ok) {
        setStatus(nextStatus);
        setDirty(false);
        setMessage("저장됨");
        router.refresh();
      } else {
        setMessage(result.message ?? "저장 실패");
      }
    });
  };

  const handleDelete = () => {
    if (
      !window.confirm(
        `${order.order_code} (${order.recipient_name}) 주문을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteOrderAction(order.id);
      if (result.ok) {
        router.refresh();
      } else {
        setMessage(result.message ?? "삭제 실패");
      }
    });
  };

  return (
    <tr className="border-b border-border last:border-0 hover:bg-background">
      <td className="px-4 py-3">
        <Link
          href={`/admin/orders/${order.id}`}
          className="font-medium text-brand hover:underline"
        >
          {order.order_code}
        </Link>
      </td>
      <td className="px-4 py-3 text-muted">{order.created_at.slice(0, 10)}</td>
      <td className="px-4 py-3">{order.label_design}</td>
      <td className="px-4 py-3">{order.recipient_name}</td>
      <td className="px-4 py-3">
        {order.baby_name_kr ??
          (order.groom_name_kr || order.bride_name_kr
            ? `${order.groom_name_kr ?? ""}/${order.bride_name_kr ?? ""}`
            : "")}
      </td>
      <td className="px-4 py-3">{order.event_date}</td>
      <td className="px-4 py-3">{order.ship_date}</td>
      <td className="px-2 py-2">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus);
            setDirty(true);
          }}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2">
        <input
          value={trackingNo}
          onChange={(e) => {
            setTrackingNo(e.target.value);
            setDirty(true);
          }}
          placeholder="송장번호"
          className="w-32 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
        />
      </td>
      <td className="px-2 py-2 whitespace-nowrap">
        <button
          onClick={handleSave}
          disabled={!dirty || isPending}
          className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-40"
        >
          저장
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="ml-2 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
        >
          삭제
        </button>
        {message && <div className="mt-1 text-[11px] text-muted">{message}</div>}
      </td>
    </tr>
  );
}
