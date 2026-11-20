"""Settings for APP_ENV=local (your laptop). NO secrets in this file."""

CONFIG = {
    "log_level": "DEBUG",
    "docs_enabled": True,  # Swagger UI at /docs
    "cors_origins": ["http://localhost:5173"],
    "public_app_url": "http://localhost:5173",  # used to build invoice share links
    "clerk_issuer": "https://REPLACE-WITH-YOUR-DEV-CLERK-DOMAIN.clerk.accounts.dev",
    "aws_region": "ap-south-1",
    "email_from": "Quillbill <no-reply@quillbill.example>",
    "email_enabled": False,  # True once SES is set up; False just logs the email
    "db_pool_size": 5,
    "razorpay_pro_plan_id": "",  # e.g. plan_XXXXXXXX from Razorpay (test mode)
}
