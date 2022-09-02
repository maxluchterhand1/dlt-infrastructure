import {
  BadRequestException,
  ExecuteStatementCommand,
  ExecuteStatementCommandOutput,
} from '@aws-sdk/client-rds-data';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import * as util from 'util';
import { DatabaseClient } from './database_endpoint';
import { executeStatementCommand } from './execute_satement_command';
import { streamToString } from './helpers';

export class DatabasePausedException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabasePausedException';
  }
}

type sqlResponse =
  | (string | number | boolean | undefined)[][]
  | DatabasePausedException
  | undefined;

export const executeSql = async (
  databaseClient: DatabaseClient,
  sql: string,
): Promise<sqlResponse> => {
  const command = executeStatementCommand({
    requestInfo: databaseClient.requestInfo,
    sql,
  });

  // eslint-disable-next-line no-use-before-define
  return sendSqlCommand<sqlResponse>(
    databaseClient,
    command,
    (result) =>
      result.records?.map((record) =>
        record
          .map((val) => val.stringValue ?? val.doubleValue ?? val.longValue ?? val.booleanValue)
          .filter(
            (val): val is string | number | boolean | undefined =>
              typeof val === 'string' ||
              typeof val === 'number' ||
              typeof val === 'boolean' ||
              typeof val === 'undefined',
          ),
      ),
    (error) => {
      throw error;
    },
    (error) => new DatabasePausedException(JSON.stringify(error)),
  );
};

export const sendSqlCommand = async <T>(
  databaseClient: DatabaseClient,
  command: ExecuteStatementCommand,
  onSuccess: (result: ExecuteStatementCommandOutput) => T,
  orElse: (error: any) => T,
  onDatabasePaused: (error: DatabasePausedException) => T,
) => {
  try {
    const result = await databaseClient.client.send(command);
    return onSuccess(result);
  } catch (error) {
    console.log(`SQL ERROR: ${util.inspect(error)}`);
    if (error instanceof BadRequestException) {
      return onDatabasePaused(error);
    }
    return orElse(error);
  }
};

export const executeSqlFile = async (
  databaseClient: DatabaseClient,
  s3Client: S3Client,
  bucketName: string,
  fileName: string,
) => {
  const s3Command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileName,
  });
  const result = await s3Client.send(s3Command);
  const sqlRaw = await streamToString(result.Body, 'utf8');
  const sql = sqlRaw.replace(/\n/g, ' ');
  const statements = sql.split(';').filter((val) => val.length > 1);
  for (const statement of statements) {
    // eslint-disable-next-line no-await-in-loop
    await executeSql(databaseClient, statement);
  }
};

export function validateSqlResultHasLengthOfAttributes(
  sqlResult: (string | number | boolean | undefined)[][] | undefined | DatabasePausedException,
  attributes: string[],
  onResultIsOfTableLength: (
    // eslint-disable-next-line no-shadow
    sqlResponse: (string | number | boolean | undefined)[][],
  ) => APIGatewayProxyStructuredResultV2 | undefined,
  onResultIsEmpty: () => any = () => undefined,
  onResultIsNotOfTableLength: () => APIGatewayProxyStructuredResultV2 | undefined = () => ({
    statusCode: 500,
    body: JSON.stringify({
      error: 'Unexpected result from database',
      result: sqlResult,
    }),
  }),
  includePrimaryKey = true,
): APIGatewayProxyStructuredResultV2 | undefined {
  if (sqlResult instanceof DatabasePausedException) {
    // eslint-disable-next-line no-use-before-define
    return defaultDatabasePausedResponse(sqlResult);
  }

  if (!sqlResult || sqlResult.length === 0) {
    return onResultIsEmpty();
  }

  const primaryKeyColumn = 1;
  const attributesLength = attributes.length + (includePrimaryKey ? primaryKeyColumn : 0);
  if (sqlResult[0].length !== attributesLength) {
    return onResultIsNotOfTableLength();
  }

  return onResultIsOfTableLength(sqlResult);
}

export const defaultDatabasePausedResponse = (error: any) => ({
  statusCode: 503,
  body: JSON.stringify({ error }),
  headers: {
    'Retry-After': '30',
  },
});
