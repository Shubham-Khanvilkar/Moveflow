terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "navira-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "terraform-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "NAVIRA"
      ManagedBy   = "Terraform"
    }
  }
}

variable "aws_region" {
  default = "ap-south-1"
}

variable "environment" {
  default = "staging"
}

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "db_password" {
  sensitive = true
}

# VPC
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "navira-${var.environment}"
  cidr = var.vpc_cidr

  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = var.environment == "staging"
  enable_dns_hostnames = true

  tags = {
    Environment = var.environment
  }
}

# RDS PostgreSQL
resource "aws_db_subnet_group" "main" {
  name       = "navira-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "rds" {
  name_prefix = "navira-rds-${var.environment}"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "main" {
  identifier = "navira-${var.environment}"

  engine         = "postgres"
  engine_version = "15"
  instance_class = var.environment == "production" ? "db.r6g.large" : "db.t3.medium"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "navira"
  username = "postgres"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = var.environment == "production" ? 30 : 7
  multi_az               = var.environment == "production"
  skip_final_snapshot    = var.environment != "production"

  tags = {
    Environment = var.environment
  }
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "main" {
  name       = "navira-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "redis" {
  name_prefix = "navira-redis-${var.environment}"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
}

resource "aws_elasticache_cluster" "main" {
  cluster_id           = "navira-${var.environment}"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.environment == "production" ? "cache.r6g.large" : "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
}

# ECS Fargate
resource "aws_ecs_cluster" "main" {
  name = "navira-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "navira-api-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.environment == "production" ? "1024" : "512"
  memory                   = var.environment == "production" ? "2048" : "1024"

  container_definitions = jsonencode([
    {
      name  = "api"
      image = "${aws_ecr_repository.api.repository_url}:latest"
      portMappings = [
        {
          containerPort = 3001
          hostPort      = 3001
        }
      ]
      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = "3001" },
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = aws_ssm_parameter.db_url.arn },
        { name = "JWT_SECRET", valueFrom = aws_ssm_parameter.jwt_secret.arn },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/navira-api-${var.environment}"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecr_repository" "api" {
  name = "navira-api-${var.environment}"
}

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/navira-api-${var.environment}"
  retention_in_days = var.environment == "production" ? 90 : 30
}

resource "aws_ssm_parameter" "db_url" {
  name  = "/navira/${var.environment}/database-url"
  type  = "SecureString"
  value = "postgresql://postgres:${var.db_password}@${aws_db_instance.main.endpoint}/navira"
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/navira/${var.environment}/jwt-secret"
  type  = "SecureString"
  value = "CHANGE_ME_${var.environment}"
}

# Outputs
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "db_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}
