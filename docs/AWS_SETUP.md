# AWS setup (one time, console first)

Do this once per environment (dev, then prod). Use the console to *learn what each piece is*. After prod works, consider recreating it as code (Terraform or AWS CDK) so it's repeatable.

**Region:** pick `ap-south-1` (Mumbai) for India customers and use it for everything.

## 0. Vocabulary
- **Lambda**: runs your code only when a request arrives; you pay per use. Our API runs here.
- **ECR**: storage for Docker images. The pipeline pushes the API image here.
- **API Gateway**: the public URL in front of Lambda.
- **RDS**: managed Postgres.
- **Amplify**: hosts the website (CDN, HTTPS).
- **IAM**: who is allowed to do what in AWS. **OIDC**: lets GitHub act as an IAM role without storing keys.
- **Docker image**: your app and everything it needs, packaged. `server/Dockerfile` describes it line by line, read it once.

## 1. Protect your wallet first
Billing → Budgets → create a monthly budget (e.g. ₹3,000) with email alerts at 50% and 100%. Enable MFA on the root account and don't use root for daily work (create an admin IAM Identity Center user).

## 2. ECR repository
ECR → Create repository `quillbill-api` (private). Rename freely; it's just the `ECR_REPOSITORY` variable.

## 3. Databases (RDS Postgres)
Create **two instances**: `app-dev` (shared by local + dev) and `app-prod`.
- Engine PostgreSQL 16, template *Dev/Test* for dev and *Production* for prod (prod: enable Multi-AZ only when revenue justifies it, turn on automated backups with 7+ days retention).
- Instance `db.t4g.micro`, 20 GB gp3, storage autoscaling on.
- Master username/password: generate a long random password, store it in a password manager.
- In the dev instance create databases `app_dev` and `app_local` (`CREATE DATABASE ...`). Prod instance: `app_prod`.
- Parameter group: set `rds.force_ssl = 1`. Connection strings use `?sslmode=require`.

**Network decision (read this).** A Lambda placed inside a private network (VPC) loses internet access unless you pay for a NAT gateway (roughly ₹2,500+/month), and our API needs the internet for Clerk, SES and Razorpay. For a minimal-budget v1 this guide therefore uses:
- Lambda **not** in a VPC, RDS **publicly accessible**, security group allowing port 5432, SSL forced, strong random passwords.
- This is a common first-stage setup, but it is a real risk: the database is reachable from the internet and protected only by the password. Mitigate: long random passwords, `rds.force_ssl`, never reuse passwords, keep dev data non-sensitive.
- Upgrade path once you have revenue: move Lambda + RDS into a VPC with a NAT (or VPC endpoints), put RDS Proxy in front, and close public access. Only the connection string and security groups change, no code changes.
- For the dev instance, you can restrict the security group to your home IP *plus* the dev Lambda only if you place that Lambda in a VPC; otherwise it must be open. Use throw-away data in dev.

## 4. Lambda functions (two per environment, same image)
The first pipeline run must push an image before you can create functions: push a `feature/setup` branch (needs steps 2 and 8 done), wait for the build.
Create functions **from container image**, picking that image:
1. `quillbill-dev-api`: memory 512 MB, timeout 29 s. Environment variables:
   - `APP_ENV` = `dev`
   - `DATABASE_URL` = `postgresql+psycopg://USER:PASSWORD@ENDPOINT:5432/app_dev?sslmode=require`
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (later)
2. `quillbill-dev-migrate`: same image and variables. Configuration → *Image configuration* → override **Command** with `app.migrate_handler.handler`. Timeout 5 min.
3. Give both functions' execution role the permission `ses:SendRawEmail` (when you turn email on).

Lambda environment variables are encrypted at rest and invisible to GitHub. Later, move them to Secrets Manager if you want rotation/audit.

## 5. API Gateway
API Gateway → Create **HTTP API** → integration: your `...-api` Lambda → route `ANY /{proxy+}` → stage `$default` (auto-deploy). Copy the **Invoke URL** (e.g. `https://abc123.execute-api.ap-south-1.amazonaws.com`).
- Put `<invoke URL>/api/v1` into `apiBaseUrl` in `client/src/config/dev.config.js` and the variable `API_URL` (without `/api/v1`).
- Leave API Gateway CORS **off**; the app handles CORS (`cors_origins` in server config).
- Stage → Throttling: set a sensible default (e.g. 20 requests/s) as basic abuse protection.
- Custom domain (`api.yourdomain`) later via API Gateway custom domains + ACM certificate.

## 6. Amplify (website hosting)
Amplify → **Deploy without Git provider** (manual deployment) → create app, then create branches named `dev` (and `prod` in the prod account setup). Our pipeline uploads the built site to it, so Amplify never watches Git.
- Rewrites and redirects: add a rule, source `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`, target `/index.html`, type `200 (Rewrite)`. This makes URLs like `/invoices` work on refresh.
- Note the **App ID** (`AMPLIFY_APP_ID`) and branch name (`AMPLIFY_BRANCH`).
- Put the Amplify URL into `cors_origins` and `public_app_url` in `server/config/dev.config.py`.

## 7. Clerk, SES, Razorpay
- **Clerk**: for prod create a *production instance* (needs your domain). Put its keys into `prod.config.js` / `prod.config.py` (`clerk_issuer`).
- **SES**: verify your sending domain (add the DNS records), then request *production access* (new accounts are sandboxed and can only email verified addresses). Then set `email_enabled: True` in the config. Set `email_from` to an address on that domain.
- **Razorpay** (Subscriptions): create a monthly **Plan** for Pro, copy its id to `razorpay_pro_plan_id` in config. Settings → Webhooks → URL `<API URL>/api/v1/billing/webhook`, events `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.halted`, `subscription.completed`; copy the webhook secret into the Lambda variable. Test with Razorpay *test mode* keys on dev. Also update the display price in `client/src/features/billing/BillingPage.jsx` (`PRO_PRICE`) to match the plan.

## 8. GitHub ↔ AWS (no stored keys)
1. IAM → Identity providers → Add provider → OpenID Connect → URL `https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com`.
2. Create two roles trusted by that provider. Trust policy (replace values):
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike": { "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USER/YOUR_REPO:*" }
    }
  }]
}
```
   - **Build role** (`AWS_BUILD_ROLE_ARN`): permissions to push to your ECR repo (`ecr:GetAuthorizationToken` on `*`; layer upload/`PutImage`/`BatchCheckLayerAvailability`/`InitiateLayerUpload`/`UploadLayerPart`/`CompleteLayerUpload`/`BatchGetImage`/`GetDownloadUrlForLayer` on the repo).
   - **Deploy role** (one per environment; tighten the `sub` to `repo:...:environment:prod` for prod): `ecr:GetAuthorizationToken`, `ecr:DescribeImages`; `lambda:UpdateFunctionCode`, `lambda:GetFunction`, `lambda:InvokeFunction` on that environment's two functions; `amplify:CreateDeployment`, `amplify:StartDeployment`, `amplify:GetJob` on that app.
3. GitHub → Settings → Environments → create `dev` and `prod`. Add the variables listed in CICD.md. Add *required reviewers* to `prod`. Repository variables hold the build role.
4. Settings → Branches: protect `prod` and `dev` (require the CI checks to pass before merging).

## 9. Verify
Push to `dev`. Watch Actions: tests → build → deploy. Then open `<API_URL>/api/v1/health` (shows version/build/env) and your Amplify URL, sign up, create a client and an invoice.

## Rough monthly cost
Two small RDS instances are the main cost (roughly ₹1,000-1,500 each); Lambda, API Gateway, Amplify, ECR and SES stay near zero at 10 customers. Check current prices in the AWS calculator. To save money early you can stop the dev instance when not working (it auto-restarts after 7 days).
