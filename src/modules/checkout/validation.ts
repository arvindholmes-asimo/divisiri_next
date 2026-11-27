import { z } from "zod";

const line = (max: number) => z.string().trim().min(1).max(max);

export const detailsSchema = z.object({
  email: z.string().trim().pipe(z.email().max(200)),
  first_name: line(80),
  last_name: line(80),
  phone: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, "").replace(/^(\+91|0)(?=\d{10}$)/, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/)),
  address_1: line(200),
  address_2: z.string().trim().max(200).default(""),
  city: line(80),
  province: line(80),
  postal_code: z.string().trim().regex(/^[1-9]\d{5}$/),
});

export const lineSchema = z.object({
  line_id: z.string().regex(/^cali_[A-Za-z0-9]{10,40}$/),
  quantity: z.coerce.number().int().min(0).max(10),
});

// Error codes travel in the URL. Only these fixed messages are ever shown.
export const messages: Record<string, string> = {
  add: "That product couldn't be added. It may not be available for sale.",
  update: "Your cart couldn't be updated. Please try again.",
  details: "Check your details: a valid email, 10-digit mobile number and 6-digit PIN code are needed.",
  delivery: "Delivery isn't available for this order yet.",
  server: "Something went wrong. Please try again.",
};
