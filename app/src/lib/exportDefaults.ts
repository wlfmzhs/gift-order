import { getFieldRequirements } from "./orderRules";
import type { NewOrderInput } from "./types";
import { defaultShipDate } from "./shipDate";

export interface ExportDefaults {
  export_recipient_display: string;
  export_birthday: string;
  export_etc: string;
  ship_date: string;
}

/**
 * 주문 제출 시점에 스프레드시트용 필드의 기본값을 계산한다.
 * 관리자가 /admin/export 화면에서 언제든 덮어쓸 수 있으므로,
 * 여기서는 "최대한 합리적인 기본값"만 만들면 된다.
 */
export function computeExportDefaults(order: NewOrderInput): ExportDefaults {
  const req = getFieldRequirements(order.label_design);

  let recipientDisplay: string;
  let etc: string;

  if (req.isWedding) {
    const brideName = order.bride_name_kr ?? "";
    const brideEn = order.bride_name_en ? `(${order.bride_name_en})` : "";
    recipientDisplay = `${brideName}${brideEn}`.trim();
    const groom = order.groom_name_kr ?? "";
    const bride = order.bride_name_kr ?? "";
    etc = groom || bride ? `${groom}/${bride} 신랑 신부` : "";
  } else {
    const mom = order.mother_name ? `${order.mother_name} ` : "";
    const baby = order.baby_name_kr ?? "";
    const babyEn = order.baby_name_en ? `(${order.baby_name_en})` : "";
    recipientDisplay = `${mom}${baby}${babyEn}`.trim();
    etc =
      order.father_name || order.mother_name
        ? `${order.father_name ?? ""}/${order.mother_name ?? ""} 아빠 엄마`
        : "";
  }

  if (!recipientDisplay) {
    recipientDisplay = order.recipient_name;
  }

  const birthday = req.showBirthday && order.birthday_date ? order.birthday_date : "";

  return {
    export_recipient_display: recipientDisplay,
    export_birthday: birthday,
    export_etc: etc,
    ship_date: defaultShipDate(order.event_date),
  };
}
