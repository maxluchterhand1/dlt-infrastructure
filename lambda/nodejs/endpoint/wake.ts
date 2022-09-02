import { Context, APIGatewayProxyStructuredResultV2, APIGatewayProxyEventV2 } from 'aws-lambda';
import { DatabaseClient, databaseEndpoint } from './shared/database_endpoint';
import { internalErrorResult } from './shared/helpers';
import { DatabasePausedException, executeSql } from './shared/sql';

const handleGet = async (
  databaseClient: DatabaseClient,
  retries = 10,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const res = await executeSql(databaseClient, `SHOW DATABASES;`);

    if (retries === 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          err: 'database did not wake up',
        }),
      };
    }

    if (res instanceof DatabasePausedException) {
      await new Promise((resolve) => {
        setTimeout(resolve, 6000);
      });
      return handleGet(databaseClient, retries - 1);
    }

    return {
      statusCode: 200,
    };
  } catch (err) {
    return internalErrorResult(err, 'get wake');
  }
};

const wake = async (
  event: APIGatewayProxyEventV2,
  context: Context,
  databaseClient: DatabaseClient,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const { method } = event.requestContext.http;

  switch (method) {
    case 'GET':
      return handleGet(databaseClient);
    default:
      return {
        statusCode: 405,
        body: JSON.stringify({
          err: 'Unsupported method',
        }),
      };
  }
};

export const handler = databaseEndpoint(wake);
