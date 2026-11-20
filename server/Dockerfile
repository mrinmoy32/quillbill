# Builds the API as an AWS Lambda container image.
# Build from the REPO ROOT (so VERSION and brand.config.json are included):
#   docker build -f server/Dockerfile -t quillbill-api .
# Lambda's official base image already contains the Lambda runtime.
FROM public.ecr.aws/lambda/python:3.12

# 1) Dependencies first: Docker caches this layer, so rebuilds are fast when only code changed.
COPY server/requirements.txt ${LAMBDA_TASK_ROOT}/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 2) Application code, per-environment config files, migrations
COPY server/app ${LAMBDA_TASK_ROOT}/app
COPY server/config ${LAMBDA_TASK_ROOT}/config
COPY server/migrations ${LAMBDA_TASK_ROOT}/migrations
COPY server/alembic.ini ${LAMBDA_TASK_ROOT}/alembic.ini

# 3) Product identity and version (shared with the frontend)
COPY brand.config.json VERSION ${LAMBDA_TASK_ROOT}/

# Which commit is this? Passed in by CI and shown at /api/v1/health.
ARG BUILD_SHA=dev
ENV BUILD_SHA=${BUILD_SHA}

# The Lambda function runs this. The migration Lambda overrides it with app.migrate_handler.handler
CMD ["app.main.handler"]
