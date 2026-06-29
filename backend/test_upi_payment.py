"""Fire a test Razorpay UPI payment directly at the SentinelAI webhook.

Usage:
    python test_upi_payment.py           # normal payment
    python test_upi_payment.py attack    # high-value fraud payment
"""

import sys, json, hmac, hashlib, httpx

WEBHOOK_URL = "http://127.0.0.1:8000/webhook/upi"
WEBHOOK_SECRET = "sentinelaihack2026"

NORMAL_PAYMENT = {
    "event": "payment.captured",
    "payload": {
        "payment": {
            "entity": {
                "id": "pay_test_normal_001",
                "method": "upi",
                "vpa": "rohit.sharma@okicici",
                "amount": 49900,        # ₹499 in paise
                "currency": "INR",
                "status": "captured",
                "description": "Order #1234",
                "acquirer_data": {"rrn": "123456789012"},
                "created_at": None,
            }
        }
    },
    "payee_vpa": "merchant.zomato@hdfcbank",
    "count_in_window": 2,
}

ATTACK_PAYMENT = {
    "event": "payment.captured",
    "payload": {
        "payment": {
            "entity": {
                "id": "pay_test_fraud_001",
                "method": "upi",
                "vpa": "priya.v@paytm",
                "amount": 9500000,      # ₹95,000 in paise — suspicious high value
                "currency": "INR",
                "status": "captured",
                "description": "Transfer",
                "acquirer_data": {"rrn": "999888777666"},
                "created_at": None,
            }
        }
    },
    "payee_vpa": "unknown.payee@paytm",  # new/unseen payee
    "count_in_window": 47,              # burst of transactions
}


def send(payload: dict, label: str) -> None:
    body = json.dumps(payload).encode()
    sig = hmac.new(WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()

    resp = httpx.post(
        WEBHOOK_URL,
        content=body,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": sig,
        },
        timeout=10,
    )
    print(f"[{label}] {resp.status_code} → {resp.json()}")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "normal"
    if mode == "attack":
        print("Firing HIGH-VALUE UPI FRAUD payment...")
        send(ATTACK_PAYMENT, "ATTACK")
    else:
        print("Firing normal UPI payment...")
        send(NORMAL_PAYMENT, "NORMAL")
