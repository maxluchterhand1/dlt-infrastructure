import { Context, APIGatewayProxyStructuredResultV2, APIGatewayProxyEventV2 } from 'aws-lambda';
import {
  DatabaseClient,
  databaseEndpoint,
  proxyResultHandleDelete,
  proxyResultHandlePatch,
  proxyResultHandlePut,
} from './shared/database_endpoint';
import { internalErrorResult, validateBodyOn, validateIdOn } from './shared/helpers';
import { executeSql, validateSqlResultHasLengthOfAttributes } from './shared/sql';
import {
  schema,
  validateBodyAgainstSchema,
  validateBodyAgainstSchemaAllowUndefined,
} from './shared/validate_body';

const databaseName = 'sasat';
const userTableName = 'user';
const primaryKey = 'id';

const userTableAttributes = ['example'];

export const putUserSchema: schema = {
  example: 'string',
};

export const patchUserSchema: schema = {
  example: ['string', 'undefined'],
};

const handleGet = async (
  databaseClient: DatabaseClient,
  primaryKeyValue: string,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const res = await executeSql(
      databaseClient,
      `SELECT ${primaryKey}, ${userTableAttributes.join(', ')}
       FROM ${databaseName}.${userTableName}
       WHERE ${primaryKey} = "${primaryKeyValue}";`,
    );

    return validateSqlResultHasLengthOfAttributes(
      res,
      userTableAttributes,
      (sqlResponse) => {
        const row = sqlResponse[0];
        return {
          statusCode: 200,
          body: JSON.stringify({
            [primaryKey]: row[0],
            example: row[1],
            created_at: row[2],
          }),
        };
      },
      () => ({
        statusCode: 404,
        body: JSON.stringify({
          error: 'User not found',
        }),
      }),
    )!;
  } catch (error) {
    return internalErrorResult(error, 'get user');
  }
};

const handleDelete = async (databaseClient: DatabaseClient, primaryKeyValue: string) =>
  proxyResultHandleDelete({
    databaseClient,
    databaseName,
    tableName: userTableName,
    primaryKey,
    primaryKeyValue,
  });

const handlePut = async (databaseClient: DatabaseClient, primaryKeyValue: string, body: any) =>
  proxyResultHandlePut({
    databaseClient,
    bodyValidation: (_body) => validateBodyAgainstSchema(_body, putUserSchema),
    body,
    databaseName,
    tableName: userTableName,
    primaryKey,
    primaryKeyValue,
  });

const handlePatch = async (databaseClient: DatabaseClient, primaryKeyValue: string, body: any) =>
  proxyResultHandlePatch({
    databaseClient,
    bodyValidation: (_body) => validateBodyAgainstSchemaAllowUndefined(_body, patchUserSchema),
    body,
    databaseName,
    tableName: userTableName,
    primaryKey,
    primaryKeyValue,
  });

const user = async (
  event: APIGatewayProxyEventV2,
  context: Context,
  databaseClient: DatabaseClient,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const { method } = event.requestContext.http;

  const primaryKeyValue = event.pathParameters?.id;

  switch (method) {
    case 'PUT':
      return handlePut(databaseClient, primaryKeyValue!, JSON.parse(event.body!));
    case 'GET':
      return handleGet(databaseClient, primaryKeyValue!);
    case 'PATCH':
      return handlePatch(databaseClient, primaryKeyValue!, JSON.parse(event.body!));
    case 'DELETE':
      return handleDelete(databaseClient, primaryKeyValue!);
    default:
      return {
        statusCode: 405,
        body: JSON.stringify({
          error: 'Unsupported method',
          method,
        }),
      };
  }
};

export const handler = validateIdOn(
  ['PUT', 'GET', 'PATCH', 'DELETE'],
  validateBodyOn(['PUT', 'PATCH'], databaseEndpoint(user)),
);
