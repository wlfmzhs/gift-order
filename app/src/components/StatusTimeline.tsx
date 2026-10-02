import type { OrderStatus } from "@/lib/types";

const STEPS: OrderStatus[] = ["접수완료", "발송완료"];

export default function StatusTimeline({ status }: { status: OrderStatus }) {
  const currentIndex = STEPS.indexOf(status);

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        return (
          <div key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  done ? "bg-brand text-white" : "bg-border text-muted"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`whitespace-nowrap text-[11px] ${
                  done ? "text-foreground" : "text-muted"
                }`}
              >
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 ${
                  i < currentIndex ? "bg-brand" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
