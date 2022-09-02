import { ExecuteStatementCommand } from '@aws-sdk/client-rds-data';
import { SqlRequestInfo } from './database_endpoint';

export const executeStatementCommand = (parameter: {
  requestInfo: SqlRequestInfo;
  sql: string;
}): ExecuteStatementCommand => {
  return new ExecuteStatementCommand({
    ...parameter.requestInfo,
    sql: parameter.sql.replace('\n', ' '),
  });
};
