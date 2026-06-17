import os

# Must be set before any module-level code in generate_controller / images_controller runs,
# since those modules read env vars at import time.
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("NOVITA_KEY", "test-novita-key")
os.environ.setdefault("SESSION_SECRET_KEY", "test-session-secret")
os.environ.setdefault("S3_URL", "https://test.s3.amazonaws.com")
os.environ.setdefault("AWS_ACCESS_KEY_ID", "test-access-key-id")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "test-secret-key")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_placeholder")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_placeholder")
os.environ.setdefault("STRIPE_API_KEY", "sk_test_placeholder")
os.environ.setdefault("STRIPE_ENDPOINT_SECRET", "whsec_placeholder")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("NEXTAUTH_SECRET", "test-nextauth-secret")
os.environ.setdefault("NEXTAUTH_URL", "http://localhost:3000")
os.environ.setdefault("BACKEND_JWT_SECRET", "test-backend-secret")
os.environ.setdefault("STRIPE_UNLOCK_PRICE_ID", "price_test_unlock_placeholder")
os.environ.setdefault("RESEND_API_KEY", "re_test_placeholder")
os.environ.setdefault("EMAIL_FROM", "Q-Art <login@test.local>")
