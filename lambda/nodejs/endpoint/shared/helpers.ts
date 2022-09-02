import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { Readable } from 'stream';

export const internalErrorResult = (
  error: any,
  command: any,
): APIGatewayProxyStructuredResultV2 => {
  return {
    statusCode: 500,
    body: JSON.stringify({ error, command }),
  };
};

export const streamToString = (stream: Readable, encoding: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString(encoding)));
  });

export const validateBodyOn = (
  methods: string[],
  fn: (
    event: APIGatewayProxyEventV2,
    context: Context,
  ) => Promise<APIGatewayProxyStructuredResultV2>,
): ((
  event: APIGatewayProxyEventV2,
  context: Context,
) => Promise<APIGatewayProxyStructuredResultV2>) => {
  return async (event: APIGatewayProxyEventV2, context: Context) => {
    if (methods.includes(event.requestContext.http.method)) {
      if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'body is not valid json', body: event.body }),
        };
      }
      try {
        JSON.parse(event.body);
      } catch (error) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'body is not valid json', body: event.body }),
        };
      }
    }

    return fn(event, context);
  };
};

export const validateIdOn = (
  methods: string[],
  fn: (
    event: APIGatewayProxyEventV2,
    context: Context,
  ) => Promise<APIGatewayProxyStructuredResultV2>,
): ((
  event: APIGatewayProxyEventV2,
  context: Context,
) => Promise<APIGatewayProxyStructuredResultV2>) => {
  return async (event: APIGatewayProxyEventV2, context: Context) => {
    if (methods.includes(event.requestContext.http.method)) {
      if (!event.pathParameters?.id) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Missing required id path parameter',
            body: event.body,
            pathParameters: event.pathParameters,
          }),
        };
      }
    }
    return fn(event, context);
  };
};
