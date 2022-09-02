import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { ServerlessCluster } from 'aws-cdk-lib/aws-rds';
import { BaseSasatEndpointProps, DltEndpoint } from './dlt_endpoint';

export interface DatabaseEndpointProps extends BaseSasatEndpointProps {
  readonly databaseCluster: ServerlessCluster;
}

export class DatabaseEndpoint extends DltEndpoint {
  public readonly handler: NodejsFunction;

  static databaseClusterEnvVars(cluster: ServerlessCluster): { [k: string]: string } {
    return {
      CLUSTER_ARN: cluster.clusterArn,
      SECRET_ARN: cluster.secret!.secretArn,
    };
  }

  constructor(scope: Construct, id: string, props: DatabaseEndpointProps) {
    super(scope, id, {
      ...props,
      envVars: {
        ...DatabaseEndpoint.databaseClusterEnvVars(props.databaseCluster),
      },
      resourceGrant: (grantee: NodejsFunction) => {
        props.databaseCluster.grantDataApiAccess(grantee);
      },
    });
  }
}
