import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { DatabaseClusterEngine, ServerlessCluster } from 'aws-cdk-lib/aws-rds';

interface StorageStackProps extends StackProps {
  readonly vpc: Vpc;
}

export class DatabaseStack extends Stack {
  public readonly databaseCluster: ServerlessCluster;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    this.databaseCluster = new ServerlessCluster(this, 'database', {
      engine: DatabaseClusterEngine.AURORA_MYSQL,
      enableDataApi: true,
      removalPolicy: RemovalPolicy.DESTROY,
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
    });
  }
}
