"""Send email through AWS SES. With email_enabled=False (local/dev) it only logs, so you can't spam anyone by accident."""
import logging
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import boto3

from app.settings import settings

log = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str, attachment: tuple[str, bytes] | None = None, reply_to: str | None = None) -> None:
    if not settings.config.email_enabled:
        log.info("EMAIL (not sent, email_enabled=False) to=%s subject=%s\n%s", to, subject, body)
        return

    msg = MIMEMultipart()
    msg["From"] = settings.config.email_from
    msg["To"] = to
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.attach(MIMEText(body, "plain", "utf-8"))
    if attachment:
        filename, content = attachment
        part = MIMEApplication(content, _subtype="pdf")
        part.add_header("Content-Disposition", "attachment", filename=filename)
        msg.attach(part)

    boto3.client("ses", region_name=settings.config.aws_region).send_raw_email(
        Source=settings.config.email_from, Destinations=[to], RawMessage={"Data": msg.as_string()}
    )
