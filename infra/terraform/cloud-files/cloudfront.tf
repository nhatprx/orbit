locals {
  cloud_origin_id  = "s3-orbit-cloud-files"
  use_custom_cert  = var.cloudfront_acm_certificate_arn != ""
  cloud_path_rules = ["cloud/users/*", "cloud/workspaces/*", "cloud/projects/*"]
}

resource "aws_cloudfront_origin_access_control" "cloud_files" {
  name                              = "${var.bucket_name}-oac"
  description                       = "OAC for Orbit Cloud Files private S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_public_key" "cloud_files" {
  name        = "orbit-cloud-files-${var.environment}-key"
  comment     = "RSA public key for Orbit Cloud Files Signed URLs"
  encoded_key = var.cloudfront_public_key_pem
}

resource "aws_cloudfront_key_group" "cloud_files" {
  name    = "orbit-cloud-files-${var.environment}-key-group"
  comment = "Trusted key group for Orbit Cloud Files Signed URLs"
  items   = [aws_cloudfront_public_key.cloud_files.id]
}

resource "aws_cloudfront_cache_policy" "immutable_objects" {
  name        = "orbit-cloud-files-${var.environment}-immutable"
  comment     = "Long-lived cache policy for immutable UUID Cloud Files keys"
  min_ttl     = 3600
  default_ttl = 86400
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = [
          "response-content-disposition",
          "response-content-type"
        ]
      }
    }
  }
}

resource "aws_cloudfront_response_headers_policy" "cloud_files" {
  name    = "orbit-cloud-files-${var.environment}-headers"
  comment = "Security headers for Orbit Cloud Files downloads"

  security_headers_config {
    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
  }

  custom_headers_config {
    items {
      header   = "X-Robots-Tag"
      value    = "noindex, nofollow"
      override = true
    }
  }
}

resource "aws_cloudfront_distribution" "cloud_files" {
  enabled         = true
  is_ipv6_enabled = true
  http_version    = "http2and3"
  price_class     = var.cloudfront_price_class
  aliases         = var.cloudfront_aliases
  comment         = "Orbit Cloud Files private distribution (${var.environment})"

  origin {
    domain_name              = aws_s3_bucket.cloud_files.bucket_regional_domain_name
    origin_id                = local.cloud_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.cloud_files.id
  }

  default_cache_behavior {
    target_origin_id           = local.cloud_origin_id
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    trusted_key_groups         = [aws_cloudfront_key_group.cloud_files.id]
    cache_policy_id            = aws_cloudfront_cache_policy.immutable_objects.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cloud_files.id
  }

  dynamic "ordered_cache_behavior" {
    for_each = local.cloud_path_rules
    content {
      path_pattern               = ordered_cache_behavior.value
      target_origin_id           = local.cloud_origin_id
      viewer_protocol_policy     = "redirect-to-https"
      allowed_methods            = ["GET", "HEAD"]
      cached_methods             = ["GET", "HEAD"]
      compress                   = true
      trusted_key_groups         = [aws_cloudfront_key_group.cloud_files.id]
      cache_policy_id            = aws_cloudfront_cache_policy.immutable_objects.id
      response_headers_policy_id = aws_cloudfront_response_headers_policy.cloud_files.id
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = !local.use_custom_cert
    acm_certificate_arn            = local.use_custom_cert ? var.cloudfront_acm_certificate_arn : null
    ssl_support_method             = local.use_custom_cert ? "sni-only" : null
    minimum_protocol_version       = local.use_custom_cert ? "TLSv1.2_2021" : "TLSv1"
  }
}
