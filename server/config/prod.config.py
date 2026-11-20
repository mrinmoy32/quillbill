"""Settings for APP_ENV=prod (AWS production). NO secrets in this file."""

CONFIG = {
    "log_level": "INFO",
    "docs_enabled": False,  # hide Swagger in production
    "cors_origins": ["https://app.quillbill.example"],
    "public_app_url": "https://app.quillbill.example",
    "clerk_issuer": "https://clerk.quillbill.example",  # your Clerk *production* instance
    "aws_region": "ap-south-1",
    "email_from": "Quillbill <no-reply@quillbill.example>",
    "email_enabled": True,
    "db_pool_size": 1,
    "razorpay_pro_plan_id": "",
}
