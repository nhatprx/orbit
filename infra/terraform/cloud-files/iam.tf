# Note: AWS S3 HeadObject API calls are authorized by s3:GetObject (and s3:ListBucket
# for 404 vs 403 disambiguation). AWS IAM does not define a separate s3:HeadObject action.
data "aws_iam_policy_document" "orbit_app_cloud_files" {
  statement {
    sid    = "CloudFilesObjectOperations"
    effect = "Allow"

    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
      "s3:AbortMultipartUpload",
      "s3:ListMultipartUploadParts"
    ]

    resources = [
      "${aws_s3_bucket.cloud_files.arn}/cloud/*"
    ]
  }

  statement {
    sid    = "CloudFilesBucketList"
    effect = "Allow"

    actions = [
      "s3:ListBucket",
      "s3:ListBucketMultipartUploads"
    ]

    resources = [
      aws_s3_bucket.cloud_files.arn
    ]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["cloud/*"]
    }
  }
}

resource "aws_iam_policy" "orbit_app_cloud_files" {
  name        = "orbit-cloud-files-${var.environment}-app-policy"
  description = "Least-privilege S3 policy for Orbit backend Cloud Files operations"
  policy      = data.aws_iam_policy_document.orbit_app_cloud_files.json
}

resource "aws_iam_role_policy_attachment" "orbit_ec2_cloud_files" {
  count = var.ec2_role_name != "" ? 1 : 0

  role       = var.ec2_role_name
  policy_arn = aws_iam_policy.orbit_app_cloud_files.arn
}
