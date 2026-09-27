import crypto from 'node:crypto';
import { env } from '../config/env';

/**
 * Payment gateway abstraction modelled on Razorpay's flow:
 *   1. server creates an order for the amount,
 *   2. client completes checkout and receives { paymentId, signature },
 *   3. server verifies signature = HMAC_SHA256(orderId|paymentId, secret).
 *
 * Only a mock provider ships with the assignment; a real Razorpay provider
 * would implement the same interface using the Razorpay SDK.
 */
export interface PaymentOrder {
  provider: string;
  orderId: string;
  amount: number;
  currency: string;
}

export interface PaymentGateway {
  createOrder(input: { amount: number; currency: string; receipt: string }): Promise<PaymentOrder>;
  verifySignature(orderId: string, paymentId: string, signature: string): boolean;
}

const sign = (orderId: string, paymentId: string) =>
  crypto.createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET).update(`${orderId}|${paymentId}`).digest('hex');

const randomId = (prefix: string) => `${prefix}_${crypto.randomBytes(9).toString('base64url')}`;

class MockGateway implements PaymentGateway {
  async createOrder({ amount, currency }: { amount: number; currency: string; receipt: string }) {
    return { provider: 'mock', orderId: randomId('order'), amount, currency };
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    const expected = Buffer.from(sign(orderId, paymentId), 'hex');
    const actual = Buffer.from(signature, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }

  /** Stands in for the hosted checkout page. Exposed only through a dev-only route. */
  simulateCheckout(orderId: string) {
    const paymentId = randomId('pay');
    return { paymentId, signature: sign(orderId, paymentId) };
  }
}

export const mockGateway = new MockGateway();
export const paymentGateway: PaymentGateway = mockGateway;
