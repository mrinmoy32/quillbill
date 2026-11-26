"""Settings for APP_ENV=dev (AWS dev environment). NO secrets in this file."""

CONFIG = {
    "log_level": "INFO",
    "docs_enabled": True,
    "cors_origins": ["https://dev.quillbill.example", "http://localhost:5173"],
    "public_app_url": "https://dev.quillbill.example",
    "clerk_issuer": "https://stunning-coyote-4211.clerk.accounts.dev",
    "aws_region": "ap-south-1",
    "email_from": "Quillbill <no-reply@quillbill.example>",
    "email_enabled": False,
    "db_pool_size": 1,  # Lambda: 1 connection per running instance
    "razorpay_pro_plan_id": "",
}
