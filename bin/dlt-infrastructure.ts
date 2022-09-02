#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CognitoStack } from '../lib/stack/cognito-stack';
import { VpcStack } from '../lib/stack/vpc-stack';
import { DatabaseStack } from '../lib/stack/database-stack';
import { EndpointStack } from '../lib/stack/endpoint-stack';

const main = async () => {
  const app = new cdk.App();

  const commonStackProps = {
    env: { region: 'eu-central-1' },
  };

  const cognitoStack = new CognitoStack(app, 'cognito-stack', commonStackProps);

  const vpcStack = new VpcStack(app, 'vpc-stack', commonStackProps);

  const databaseStack = new DatabaseStack(app, 'database-stack', {
    ...commonStackProps,
    vpc: vpcStack.vpc,
  });

  new EndpointStack(app, 'endpoint-stack', {
    ...commonStackProps,
    databaseCluster: databaseStack.databaseCluster,
    vpc: vpcStack.vpc,
    authorizationScopes: [],
    jwtAudience: [cognitoStack.clientId],
    jwtIssuer: `https://cognito-idp.eu-central-1.amazonaws.com/${cognitoStack.userPool.userPoolId}`,
  });
};

main();
