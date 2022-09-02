import { Construct } from 'constructs';
import * as path from 'path';
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpJwtAuthorizer } from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Stack, StackProps } from 'aws-cdk-lib';
import { ServerlessCluster } from 'aws-cdk-lib/aws-rds';
import { DatabaseEndpoint } from '../construct/api_endpoint/database_endpoint';

export interface EndpointStackProps extends StackProps {
  readonly vpc: Vpc;
  readonly databaseCluster: ServerlessCluster;
  readonly jwtIssuer: string;
  readonly jwtAudience: string[];
  readonly authorizationScopes: string[];
}

export class EndpointStack extends Stack {
  constructor(scope: Construct, id: string, props: EndpointStackProps) {
    super(scope, id, props);

    const httpApi = new HttpApi(this, 'http-api', {
      defaultAuthorizer: new HttpJwtAuthorizer('http-api-authorizer', props.jwtIssuer, {
        jwtAudience: props.jwtAudience,
      }),
      defaultAuthorizationScopes: props.authorizationScopes,
    });

    new DatabaseEndpoint(this, 'user-endpoint', {
      httpApi,
      handlerPath: path.join(__dirname, `/../../lambda/endpoints/user.ts`),
      handlerFunctionName: 'handler',
      databaseCluster: props.databaseCluster,
      endpointPath: '/user/{id}',
      methods: [HttpMethod.PUT, HttpMethod.GET, HttpMethod.PATCH, HttpMethod.DELETE],
      vpc: props.vpc,
    });
  }
}
