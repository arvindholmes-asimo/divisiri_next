"use client";

import { useState, useTransition } from "react";
import { placeOrder, startPayment } from "@/modules/checkout/actions";
import { primaryButton } from "./styles";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void };
  }
}

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

// Loaded only when the shopper chooses to pay.
function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.onload = () => resolve(true);
    script.onerror = () => {
      script.remove();
      resolve(false);
    };
    document.body.append(script);
  });
}

const UNCONFIRMED =
  "We couldn't confirm a payment yet. If money was debited, don't pay again: use “I've already paid” in a minute, or write to admin@divisiri.com.";

export function PayButton() {
  const [message, setMessage] = useState("");
  const [busy, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      // On success the action redirects, so a returned value means no order yet.
      const result = await placeOrder();
      if (result && !result.ok) setMessage(UNCONFIRMED);
    });

  const pay = () =>
    startTransition(async () => {
      setMessage("");
      const [payment, loaded] = await Promise.all([startPayment(), loadRazorpay()]);
      if (!payment.ok || !loaded || !window.Razorpay) {
        setMessage("Payment couldn't be started. Please try again.");
        return;
      }
      new window.Razorpay({
        key: payment.keyId,
        order_id: payment.orderId,
        amount: payment.amount,
        currency: "INR",
        name: "DiviSiri",
        prefill: { name: payment.name, email: payment.email, contact: payment.phone },
        handler: confirm,
      }).open();
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={pay} disabled={busy} className={primaryButton}>
          {busy ? "Please wait…" : "Pay online"}
        </button>
        <button type="button" onClick={confirm} disabled={busy} className="px-3 text-sm font-semibold underline">
          I&apos;ve already paid
        </button>
      </div>
      <p role="status" className="text-sm text-amber-900">
        {message}
      </p>
    </div>
  );
}
