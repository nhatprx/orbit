variable "aws_region" {
  description = "AWS region for the Cloud Files S3 bucket."
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Deployment environment label (e.g. prod, staging)."
  type        = string
  default     = "prod"
}

variable "bucket_name" {
  description = "Globally unique S3 bucket name dedicated to Orbit Cloud Files."
  type        = string
}

variable "allowed_cors_origins" {
  description = "Browser origins permitted to upload directly to S3 via presigned URLs."
  type        = list(string)
  default     = ["https://orbit.nhatprx.com", "http://localhost:5173"]
}

variable "cloudfront_public_key_pem" {
  description = "PEM-encoded 2048-bit RSA public key for CloudFront Signed URL verification."
  type        = string
}

variable "cloudfront_price_class" {
  description = "CloudFront edge location price class."
  type        = string
  default     = "PriceClass_200"
}

variable "cloudfront_aliases" {
  description = "Optional custom domain names (CNAMEs) for the CloudFront distribution."
  type        = list(string)
  default     = []
}

variable "cloudfront_acm_certificate_arn" {
  description = "Optional ACM certificate ARN in us-east-1 when cloudfront_aliases is non-empty."
  type        = string
  default     = ""
}

variable "ec2_role_name" {
  description = "Optional existing EC2 IAM role name to attach the Cloud Files policy to."
  type        = string
  default     = ""
}

variable "incomplete_multipart_days" {
  description = "Days before S3 automatically aborts incomplete multipart uploads."
  type        = number
  default     = 2
}

variable "intelligent_tiering_transition_days" {
  description = "Days before objects larger than 128 KB transition to S3 Intelligent-Tiering."
  type        = number
  default     = 30
}

variable "extra_tags" {
  description = "Additional AWS resource tags merged with default Orbit tags."
  type        = map(string)
  default     = {}
}
