import { z } from "zod";
import { getFieldRequirements } from "./orderRules";
import { checkTowelForEventDate } from "./towelRules";

const PHONE_REGEX = /^01[016789]-\d{3,4}-\d{4}$/;

export const orderFormSchema = z
  .object({
    label_design: z.enum(["A", "B", "C", "D", "E", "F"]),
    event_date: z.string().min(1, "행사일을 입력해주세요."),
    birthday_date: z.string().optional(),

    baby_name_kr: z.string().optional(),
    baby_name_en: z.string().optional(),
    father_name: z.string().optional(),
    mother_name: z.string().optional(),

    groom_name_kr: z.string().optional(),
    groom_name_en: z.string().optional(),
    bride_name_kr: z.string().optional(),
    bride_name_en: z.string().optional(),

    towel_color: z.string().min(1, "타올 색상을 입력해주세요."),
    embroidery_color: z.string().min(1, "자수 색상을 입력해주세요."),

    recipient_name: z.string().min(1, "받는분 성함을 입력해주세요."),
    recipient_phone: z
      .string()
      .regex(PHONE_REGEX, "휴대폰 번호 형식을 확인해주세요. (예: 010-1234-5678)"),
    recipient_zipcode: z.string().min(1, "주소 검색을 통해 우편번호를 입력해주세요."),
    recipient_address1: z.string().min(1, "주소를 입력해주세요."),
    recipient_address2: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const req = getFieldRequirements(data.label_design);

    const towelCheck = checkTowelForEventDate(data.towel_color, data.event_date);
    if (!towelCheck.ok) {
      ctx.addIssue({
        code: "custom",
        path: ["towel_color"],
        message: towelCheck.message,
      });
    }

    if (req.isWedding) {
      if (!data.groom_name_kr?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["groom_name_kr"],
          message: "신랑 성함(한글)을 입력해주세요.",
        });
      }
      if (!data.bride_name_kr?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["bride_name_kr"],
          message: "신부 성함(한글)을 입력해주세요.",
        });
      }
      return;
    }

    if (!data.baby_name_kr?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["baby_name_kr"],
        message: "아기 이름(한글)을 입력해주세요.",
      });
    }
    if (req.showBabyNameEn && !data.baby_name_en?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["baby_name_en"],
        message: "아기 이름(영문)을 입력해주세요.",
      });
    }
    if (req.showParentNames) {
      if (!data.father_name?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["father_name"],
          message: "아빠 성함을 입력해주세요.",
        });
      }
      if (!data.mother_name?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["mother_name"],
          message: "엄마 성함을 입력해주세요.",
        });
      }
    }
    if (req.showBirthday && !data.birthday_date?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["birthday_date"],
        message: "아기 첫 생일(돌) 날짜를 입력해주세요.",
      });
    }
  });

export type OrderFormValues = z.infer<typeof orderFormSchema>;

export const shippingFormSchema = z.object({
  recipient_name: orderFormSchema.shape.recipient_name,
  recipient_phone: orderFormSchema.shape.recipient_phone,
  recipient_zipcode: orderFormSchema.shape.recipient_zipcode,
  recipient_address1: orderFormSchema.shape.recipient_address1,
  recipient_address2: orderFormSchema.shape.recipient_address2,
});

export type ShippingFormValues = z.infer<typeof shippingFormSchema>;
