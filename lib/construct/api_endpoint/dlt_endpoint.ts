import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Duration } from 'aws-cdk-lib';

export interface BaseSasatEndpointProps {
  readonly httpApi: HttpApi;
  readonly handlerPath: string;
  readonly handlerFunctionName: string;
  readonly endpointPath: string;
  readonly methods: HttpMethod[];
  readonly vpc: Vpc | undefined;
}

export interface SasatEndpointProps extends BaseSasatEndpointProps {
  readonly envVars: { [k: string]: string };
  readonly resourceGrant: (grantee: NodejsFunction) => void;
}

export class DltEndpoint extends Construct {
  public readonly handler: NodejsFunction;

  constructor(scope: Construct, id: string, props: SasatEndpointProps) {
    super(scope, id);

    this.handler = new NodejsFunction(this, 'handler', {
      runtime: Runtime.NODEJS_14_X,
      handler: props.handlerFunctionName,
      entry: props.handlerPath,
      environment: props.envVars,
      vpc: props.vpc,
      vpcSubnets: props.vpc
        ? {
            subnetType: SubnetType.PRIVATE_ISOLATED,
          }
        : undefined,
      timeout: Duration.minutes(1),
    });

    props.resourceGrant(this.handler);

    props.httpApi.addRoutes({
      path: props.endpointPath,
      methods: props.methods,
      integration: new HttpLambdaIntegration('lambda-integration', this.handler),
    });
  }
}
