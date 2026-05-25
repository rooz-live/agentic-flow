#!/usr/bin/env bash

# =======================================================
# SYSTEMIC.OS - PHASE 15: TRUE NATIVE EKS BOOTSTRAP
# =======================================================
# Economical Raw AWS Deployment Script (Zero Terraform/Eksctl dependency)
# Maps VPC, IGW, Subnets, IAM Roles, and Physical EKS bindings
# Cost Warning: Triggers real-world AWS container charges upon execution

set -eo pipefail

PROFILE="admin-user"
REGION="us-west-2"
CLUSTER_NAME="multi-tenant-prod"
VPC_CIDR="10.0.0.0/16"
SUBNET_1_CIDR="10.0.1.0/24"
SUBNET_2_CIDR="10.0.2.0/24"

# Validate tools
if ! command -v aws &> /dev/null; then
    echo "[FATAL] AWS CLI not mounted globally. Ensure PATH overrides exist."
    exit 1
fi

echo "🚀 [INIT] Provisioning EKS AWS Cluster Constraints under profile: [$PROFILE]"

# 1. Network Boundary Mapping (VPC + IGW + Routes)
echo "--> Creating Systemic VPC..."
VPC_ID=$(aws ec2 create-vpc --cidr-block $VPC_CIDR --profile $PROFILE --region $REGION --query Vpc.VpcId --output text)
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames "{\"Value\":true}" --profile $PROFILE --region $REGION
echo "    [+] Mapped VPC ID: $VPC_ID"

echo "--> Attaching Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway --profile $PROFILE --region $REGION --query InternetGateway.InternetGatewayId --output text)
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID --profile $PROFILE --region $REGION

echo "--> Establishing Distributed AZ Subnets..."
AZ1="${REGION}a"
AZ2="${REGION}b"
SUB1_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block $SUBNET_1_CIDR --availability-zone $AZ1 --profile $PROFILE --region $REGION --query Subnet.SubnetId --output text)
SUB2_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block $SUBNET_2_CIDR --availability-zone $AZ2 --profile $PROFILE --region $REGION --query Subnet.SubnetId --output text)
aws ec2 modify-subnet-attribute --subnet-id $SUB1_ID --map-public-ip-on-launch --profile $PROFILE --region $REGION
aws ec2 modify-subnet-attribute --subnet-id $SUB2_ID --map-public-ip-on-launch --profile $PROFILE --region $REGION
echo "    [+] Mapped Subnets: $SUB1_ID, $SUB2_ID"

echo "--> Stitching Route Tables..."
RT_ID=$(aws ec2 create-route-table --vpc-id $VPC_ID --profile $PROFILE --region $REGION --query RouteTable.RouteTableId --output text)
aws ec2 create-route --route-table-id $RT_ID --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID --profile $PROFILE --region $REGION >/dev/null
aws ec2 associate-route-table --subnet-id $SUB1_ID --route-table-id $RT_ID --profile $PROFILE --region $REGION >/dev/null
aws ec2 associate-route-table --subnet-id $SUB2_ID --route-table-id $RT_ID --profile $PROFILE --region $REGION >/dev/null

# 2. IAM Governance Array (The Brain limits)
echo "--> Instantiating Kubernetes IAM Trust Models..."
cat > cluster-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "eks.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

CLUSTER_ROLE_ARN=$(aws iam create-role --role-name systemic-eks-cluster-role --assume-role-policy-document file://cluster-trust-policy.json --profile $PROFILE --region $REGION --query Role.Arn --output text 2>/dev/null || aws iam get-role --role-name systemic-eks-cluster-role --profile $PROFILE --query Role.Arn --output text)
aws iam attach-role-policy --role-name systemic-eks-cluster-role --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy --profile $PROFILE --region $REGION

# 3. Formally Execute EKS Cluster Loop
echo "--> Executing Physical EKS Master Nodes (This fundamentally takes 10-15 minutes on AWS limits)..."
# Waiting 10 seconds to ensure IAM role propagates
sleep 10
aws eks create-cluster \
    --name $CLUSTER_NAME \
    --role-arn $CLUSTER_ROLE_ARN \
    --resources-vpc-config subnetIds=$SUB1_ID,$SUB2_ID \
    --profile $PROFILE \
    --region $REGION >/dev/null || true

echo "--> Polling for Cluster ACTIVE State (AWS Waiter bound)..."
aws eks wait cluster-active --name $CLUSTER_NAME --profile $PROFILE --region $REGION
echo "✅ Master EKS Plane mapped successfully!"

# 4. Kubeconfig Vector Pipe
echo "--> Pulling Cluster Routing Array locally via update-kubeconfig..."
aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME --profile $PROFILE
export KUBECONFIG_PROD=~/.kube/config

echo "======================================================="
echo "✅ Phase 15 Infrastructure Gap successfully eliminated!"
echo "You can now formally execute: ./tooling/scripts/deploy_multi_tenant.sh prod"
echo "======================================================="

# Cleanup generic trust definitions
rm -f cluster-trust-policy.json
