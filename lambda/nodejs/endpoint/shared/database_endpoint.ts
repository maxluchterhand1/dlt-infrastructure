import { Context, APIGatewayProxyStructuredResultV2, APIGatewayProxyEventV2 } from 'aws-lambda';
import { ExecuteStatementCommand, RDSDataClient } from '@aws-sdk/client-rds-data';
import * as Process from 'process';
import { v4 as UUIDv4 } from 'uuid';
import { internalErrorResult } from './helpers';
import { executeStatementCommand } from './execute_satement_command';
import { defaultDatabasePausedResponse, sendSqlCommand } from './sql';

export interface SqlRequestInfo {
  resourceArn: string | undefined;
  secretArn: string | undefined;
  database?: string;
}

export interface DatabaseClient {
  readonly client: RDSDataClient;
  readonly requestInfo: SqlRequestInfo;
}

export const databaseEndpoint = (
  fn: (
    event: APIGatewayProxyEventV2,
    context: Context,
    databaseClient: DatabaseClient,
  ) => Promise<APIGatewayProxyStructuredResultV2>,
): ((
  event: APIGatewayProxyEventV2,
  context: Context,
) => Promise<APIGatewayProxyStructuredResultV2>) => {
  return async (
    event: APIGatewayProxyEventV2,
    context: Context,
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    const dbClusterOrInstanceArn = Process.env.CLUSTER_ARN;
    const awsSecretStoreArn = Process.env.SECRET_ARN;

    if (!dbClusterOrInstanceArn || !awsSecretStoreArn) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Missing database cluster environment variables',
        }),
      };
    }

    const client = new RDSDataClient({
      region: 'eu-central-1',
    });

    try {
      return await fn(event, context, {
        client,
        requestInfo: {
          resourceArn: dbClusterOrInstanceArn,
          secretArn: awsSecretStoreArn,
        },
      });
    } finally {
      client.destroy();
    }
  };
};

export interface DeleteHandlerProps {
  readonly databaseClient: DatabaseClient;
  readonly databaseName: string;
  readonly tableName: string;
  readonly primaryKey: string;
  readonly primaryKeyValue: string;
}

export const proxyResultHandleDelete = async (
  props: DeleteHandlerProps,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const command = new ExecuteStatementCommand({
    ...props.databaseClient.requestInfo,
    sql: `
      DELETE FROM ${props.databaseName}.${props.tableName}
      WHERE ${props.primaryKey} = "${props.primaryKeyValue}";`,
  });

  return sendSqlCommand<APIGatewayProxyStructuredResultV2>(
    props.databaseClient,
    command,
    (res) => ({
      statusCode: res.$metadata.httpStatusCode,
      body: JSON.stringify({
        deleted: props.primaryKeyValue,
      }),
    }),
    (error) => internalErrorResult(error, command),
    (_) => defaultDatabasePausedResponse(command),
  );
};

export interface PostHandlerProps {
  readonly databaseClient: DatabaseClient;
  readonly bodyValidation: (body: any) => boolean;
  readonly body: any;
  readonly databaseName: string;
  readonly tableName: string;
  readonly primaryKey: string;
}

export interface PutHandlerProps extends PostHandlerProps {
  readonly primaryKeyValue: string;
}

export const proxyResultHandlePut = async (
  props: PutHandlerProps,
): Promise<APIGatewayProxyStructuredResultV2> => {
  if (!props.bodyValidation(props.body)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Invalid body',
        body: props.body,
      }),
    };
  }

  const command = executeStatementCommand({
    requestInfo: props.databaseClient.requestInfo,
    sql: `
      INSERT INTO ${props.databaseName}.${props.tableName} (${props.primaryKey},
        ${Object.keys(props.body).join(', ')})
      VALUES ("${props.primaryKeyValue}", ${Object.values(props.body)
      .map((val) => (typeof val === 'string' ? `"${val}"` : val))
      .join(', ')} );`,
  });

  return sendSqlCommand<APIGatewayProxyStructuredResultV2>(
    props.databaseClient,
    command,
    (res) => ({
      statusCode: res.$metadata.httpStatusCode,
      body: JSON.stringify({
        created: props.primaryKeyValue,
      }),
    }),
    (error) => internalErrorResult(error, command),
    (_) => defaultDatabasePausedResponse(command),
  );
};

export const proxyResultHandlePost = async (
  props: PostHandlerProps,
): Promise<APIGatewayProxyStructuredResultV2> =>
  proxyResultHandlePut({ ...props, primaryKeyValue: UUIDv4() });

export interface PatchHandlerProps extends PostHandlerProps {
  readonly primaryKeyValue: string;
}

export const proxyResultHandlePatch = async (
  props: PatchHandlerProps,
): Promise<APIGatewayProxyStructuredResultV2> => {
  if (!props.bodyValidation(props.body)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Invalid body',
        body: props.body,
      }),
    };
  }

  const command = executeStatementCommand({
    requestInfo: props.databaseClient.requestInfo,
    sql: `
      UPDATE ${props.databaseName}.${props.tableName} 
      SET ${Object.keys(props.body)
        .map(
          (key) =>
            `${key} = ${
              typeof props.body[key] === 'string' ? `"${props.body[key]}"` : props.body[key]
            }`,
        )
        .join(', ')} 
      WHERE ${props.primaryKey} = "${props.primaryKeyValue}";`,
  });

  return sendSqlCommand<APIGatewayProxyStructuredResultV2>(
    props.databaseClient,
    command,
    (res) => ({
      statusCode: res.$metadata.httpStatusCode,
      body: JSON.stringify({
        patched: props.primaryKeyValue,
      }),
    }),
    (error) => internalErrorResult(error, command),
    (_) => defaultDatabasePausedResponse(command),
  );
};
