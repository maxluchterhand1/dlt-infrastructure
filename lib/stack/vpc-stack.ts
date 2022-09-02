import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  InterfaceVpcEndpoint,
  InterfaceVpcEndpointAwsService,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';

export class VpcStack extends Stack {
  readonly vpc: Vpc;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.vpc = new Vpc(this, 'vpc', {
      cidr: '10.0.0.0/16',
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'isolated',
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    new InterfaceVpcEndpoint(this, 'rds-data-endpoint', {
      vpc: this.vpc,
      service: InterfaceVpcEndpointAwsService.RDS_DATA,
      subnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
      privateDnsEnabled: true,
      open: true,
    });

    new InterfaceVpcEndpoint(this, 'secrets-manager-endpoint', {
      vpc: this.vpc,
      service: InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      subnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
      privateDnsEnabled: true,
      open: true,
    });
  }
}
