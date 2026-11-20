output "s3_bucket_name" {
  description = "Set as AWS_CLOUD_FILES_BUCKET in Orbit backend environment."
  value       = aws_s3_bucket.cloud_files.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the dedicated Cloud Files S3 bucket."
  value       = aws_s3_bucket.cloud_files.arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID serving Orbit Cloud Files."
  value       = aws_cloudfront_distribution.cloud_files.id
}

output "cloudfront_domain_name" {
  description = "Set as AWS_CLOUDFRONT_DOMAIN in Orbit backend environment."
  value       = aws_cloudfront_distribution.cloud_files.domain_name
}

output "cloudfront_public_key_id" {
  description = "Set as AWS_CLOUDFRONT_KEY_PAIR_ID in Orbit backend environment."
  value       = aws_cloudfront_public_key.cloud_files.id
}

output "cloudfront_key_group_id" {
  description = "CloudFront trusted key group ID."
  value       = aws_cloudfront_key_group.cloud_files.id
}

output "iam_policy_arn" {
  description = "ARN of the least-privilege IAM policy for the Orbit EC2 Instance Profile."
  value       = aws_iam_policy.orbit_app_cloud_files.arn
}
