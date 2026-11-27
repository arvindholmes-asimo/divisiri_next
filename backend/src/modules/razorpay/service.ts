import { createHmac, timingSafeEqual } from "node:crypto";
import { AbstractPaymentProvider, BigNumber, MedusaError } from "@medusajs/framework/utils";
import type {
  AuthorizePaymentInput, AuthorizePaymentOutput, CancelPaymentInput, CancelPaymentOutput,
  CapturePaymentInput, CapturePaymentOutput, DeletePaymentInput, DeletePaymentOutput,
  GetPaymentStatusInput, GetPaymentStatusOutput, InitiatePaymentInput, InitiatePaymentOutput,
  Logger, ProviderWebhookPayload, RefundPaymentInput, RefundPaymentOutput, RetrievePaymentInput,
  RetrievePaymentOutput, UpdatePaymentInput, UpdatePaymentOutput, WebhookActionResult,
} from "@medusajs/framework/types";
import Razorpay from "razorpay";

export type RazorpayOptions = { keyId: string; keySecret: string; webhookSecret?: string };

export type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number | string;
  currency: string;
  status: string;
};

export type RazorpayClient = {
  orders: {
    create(body: Record<string, unknown>): Promise<{ id: string }>;
    fetchPayments(orderId: string): Promise<{ items: RazorpayPayment[] }>;
  };
  payments: {
    capture(id: string, amount: number, currency: string): Promise<unknown>;
    refund(id: string, body: { amount: number }): Promise<{ id: string }>;
  };
};

type SessionData = { order_id: string; amount: number; currency: string; payment_id?: string };

// Medusa holds rupees. Razorpay takes whole paise.
export function toPaise(amount: unknown): number {
  const paise = Math.round(new BigNumber(amount as number).numeric * 100);
  if (!Number.isSafeInteger(paise) || paise <= 0) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid payment amount");
  }
  return paise;
}

function sessionData(data: Record<string, unknown> | undefined): SessionData {
  const { order_id, amount, currency } = data ?? {};
  if (typeof order_id !== "string" || typeof amount !== "number" || typeof currency !== "string") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Payment session has no Razorpay order");
  }
  return data as SessionData;
}

class RazorpayProviderService extends AbstractPaymentProvider<RazorpayOptions> {
  static identifier = "razorpay";

  private readonly client: RazorpayClient;
  private readonly logger: Logger;

  static validateOptions(options: Record<string, unknown>) {
    for (const name of ["keyId", "keySecret"]) {
      if (!options[name]) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `Razorpay option ${name} is required`);
      }
    }
  }

  // `client` is passed only by tests.
  constructor(cradle: { logger: Logger }, options: RazorpayOptions, client?: RazorpayClient) {
    super(cradle, options);
    this.logger = cradle.logger;
    this.client =
      client ??
      (new Razorpay({ key_id: options.keyId, key_secret: options.keySecret }) as unknown as RazorpayClient);
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const currency = input.currency_code.toUpperCase();
    if (currency !== "INR") {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Only INR payments are supported");
    }
    const amount = toPaise(input.amount);
    const sessionId = String(input.data?.session_id ?? "");
    const order = await this.call("create an order", () =>
      this.client.orders.create({
        amount,
        currency,
        payment_capture: true,
        // The webhook uses this to find the Medusa payment session.
        notes: { session_id: sessionId },
      }),
    );
    // Only server values are stored. Anything else the shopper sent is dropped.
    return {
      id: order.id,
      data: { order_id: order.id, amount, currency, key_id: this.config.keyId, session_id: sessionId },
    };
  }

  // A changed cart needs a new order, because a Razorpay order amount is fixed.
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return this.initiatePayment(input);
  }

  // Razorpay is the only source of truth. The browser's success message is never trusted.
  private async findPayment(data: SessionData): Promise<RazorpayPayment | undefined> {
    const { items } = await this.call("read payments", () => this.client.orders.fetchPayments(data.order_id));
    const matching = items.filter(
      (item) =>
        item.order_id === data.order_id &&
        Number(item.amount) === data.amount &&
        item.currency === data.currency,
    );
    return (
      matching.find((item) => item.status === "captured") ??
      matching.find((item) => item.status === "authorized") ??
      matching.find((item) => item.status === "refunded")
    );
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const data = sessionData(input.data);
    const payment = await this.findPayment(data);
    if (payment?.status === "captured" || payment?.status === "authorized") {
      return { status: payment.status, data: { ...data, payment_id: payment.id } };
    }
    return { status: "pending", data };
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    return this.getPaymentStatus(input);
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const data = sessionData(input.data);
    const payment = await this.findPayment(data);
    if (!payment || payment.status === "refunded") {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "No Razorpay payment is available to capture");
    }
    if (payment.status === "authorized") {
      await this.call("capture a payment", () =>
        this.client.payments.capture(payment.id, data.amount, data.currency),
      );
    }
    return { data: { ...data, payment_id: payment.id } };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const data = sessionData(input.data);
    const paymentId = data.payment_id ?? (await this.findPayment(data))?.id;
    if (!paymentId) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "No Razorpay payment is available to refund");
    }
    const refund = await this.call("refund a payment", () =>
      this.client.payments.refund(paymentId, { amount: toPaise(input.amount) }),
    );
    return { data: { ...data, payment_id: paymentId, refund_id: refund.id } };
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data };
  }

  // Razorpay has no call to cancel an order. If money already moved, staff must act.
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const data = sessionData(input.data);
    const payment = await this.findPayment(data);
    if (payment && payment.status !== "refunded") {
      this.logger.error(
        `Razorpay payment ${payment.id} is ${payment.status} but was cancelled here. Check it in the Razorpay dashboard.`,
      );
    }
    return { data };
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data };
  }

  async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    const ignored: WebhookActionResult = { action: "not_supported" };
    if (!this.signatureIsValid(payload)) return ignored;
    const body = payload.data as {
      event?: string;
      payload?: { order?: { entity?: { amount_paid?: number; notes?: { session_id?: string } } } };
    };
    const order = body.payload?.order?.entity;
    if (body.event !== "order.paid" || !order?.notes?.session_id || !order.amount_paid) return ignored;
    return {
      action: "captured",
      data: { session_id: order.notes.session_id, amount: order.amount_paid / 100 },
    };
  }

  private signatureIsValid({ rawData, headers }: ProviderWebhookPayload["payload"]): boolean {
    const secret = this.config.webhookSecret;
    const received = headers["x-razorpay-signature"];
    if (!secret || typeof received !== "string") return false;
    const expected = Buffer.from(createHmac("sha256", secret).update(rawData).digest("hex"));
    const actual = Buffer.from(received);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  // SDK errors can carry request details, so only Razorpay's description is logged.
  private async call<T>(action: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      const description = (error as { error?: { description?: string } })?.error?.description;
      this.logger.error(`Razorpay failed to ${action}: ${description ?? "unknown error"}`);
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Razorpay failed to ${action}`);
    }
  }
}

export default RazorpayProviderService;
