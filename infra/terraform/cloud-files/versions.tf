terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40.0, < 6.0.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(
      {
        Project     = "orbit"
        Component   = "cloud-files"
        Environment = var.environment
        ManagedBy   = "terraform"
      },
      var.extra_tags
    )
  }
}
