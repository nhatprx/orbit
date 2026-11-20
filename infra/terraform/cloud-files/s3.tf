resource "aws_s3_bucket" "cloud_files" {
  bucket        = var.bucket_name
  force_destroy = false
}

resource "aws_s3_bucket_ownership_controls" "cloud_files" {
  bucket = aws_s3_bucket.cloud_files.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "cloud_files" {
  bucket = aws_s3_bucket.cloud_files.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloud_files" {
  bucket = aws_s3_bucket.cloud_files.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_cors_configuration" "cloud_files" {
  bucket = aws_s3_bucket.cloud_files.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "GET", "HEAD"]
    allowed_origins = var.allowed_cors_origins
    expose_headers  = ["ETag", "x-amz-request-id"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "cloud_files" {
  bucket = aws_s3_bucket.cloud_files.id

  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = var.incomplete_multipart_days
    }
  }

  rule {
    id     = "transition-large-objects-intelligent-tiering"
    status = "Enabled"

    filter {
      object_size_greater_than = 131072
    }

    transition {
      days          = var.intelligent_tiering_transition_days
      storage_class = "INTELLIGENT_TIERING"
    }
  }
}

data "aws_iam_policy_document" "cloud_files_bucket_policy" {
  statement {
    sid     = "DenyInsecureTransport"
    effect  = "Deny"
    actions = ["s3:*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    resources = [
      aws_s3_bucket.cloud_files.arn,
      "${aws_s3_bucket.cloud_files.arn}/*"
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  statement {
    sid     = "AllowCloudFrontOACRead"
    effect  = "Allow"
    actions = ["s3:GetObject"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    resources = [
      "${aws_s3_bucket.cloud_files.arn}/cloud/*"
    ]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.cloud_files.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "cloud_files" {
  bucket = aws_s3_bucket.cloud_files.id
  policy = data.aws_iam_policy_document.cloud_files_bucket_policy.json

  depends_on = [aws_s3_bucket_public_access_block.cloud_files]
}
