import serverlessExpress from '@codegenie/serverless-express';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { app } from './app';

const serverlessHandler = serverlessExpress({ app });

export const handler = serverlessHandler;
