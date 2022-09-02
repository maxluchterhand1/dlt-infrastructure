import { UserPool, OAuthScope } from 'aws-cdk-lib/aws-cognito';
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CognitoStack extends Stack {
  public readonly userPool: UserPool;

  public readonly clientId: string;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.userPool = new UserPool(this, 'user-pool', {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const client = this.userPool.addClient('user-pool-app-client', {
      authFlows: {
        userPassword: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [OAuthScope.EMAIL, OAuthScope.PROFILE, OAuthScope.OPENID, OAuthScope.PHONE],
      },
    });

    this.clientId = client.userPoolClientId;

    this.userPool.addDomain('user-pool-domain', {
      cognitoDomain: {
        domainPrefix: 'ggfgfgdfgdfgdfgdgdfger',
      },
    });

    // this.userPool.addTrigger(
    //   UserPoolOperation.PRE_TOKEN_GENERATION,
    //   new NodejsFunction(this, 'user-pool-pre-token-generation-lambda', {
    //     runtime: lambda.Runtime.NODEJS_14_X,
    //     handler: 'handler',
    //     entry: path.join(__dirname, `/../../lambda/pre_token_auth.ts`),
    //   }),
    // );
  }
}
