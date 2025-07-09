/**
 * Job Cleanup Worker
 *
 * @description Lambda function that runs periodically to clean up old job logs
 * from CloudWatch Logs to manage storage costs
 */

import {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  DeleteLogStreamCommand,
} from '@aws-sdk/client-cloudwatch-logs';

/**
 * Job Cleanup Handler
 *
 * @description Runs daily to clean up job logs older than configured retention period
 */
export const handler = async (): Promise<void> => {
  console.log('[CLEANUP_START] Starting job cleanup process');

  const cloudWatchClient = new CloudWatchLogsClient({
    region: process.env.AWS_REGION || 'ap-northeast-1',
  });

  const logGroupName = `/aws/lambda/${process.env.AWS_LAMBDA_FUNCTION_NAME || 'heartland-contract-cadence-api'}`;
  const maxRetentionHours = parseInt(
    process.env.MAX_JOB_RETENTION_HOURS || '72',
    10,
  );

  try {
    const cutoffTime = Date.now() - maxRetentionHours * 60 * 60 * 1000;

    // List log streams
    const logStreams = await cloudWatchClient.send(
      new DescribeLogStreamsCommand({
        logGroupName,
        orderBy: 'LastEventTime',
        descending: false,
      }),
    );

    if (!logStreams.logStreams) {
      console.log('[CLEANUP_INFO] No log streams found');
      return;
    }

    let deletedCount = 0;

    // Delete old log streams
    for (const stream of logStreams.logStreams) {
      if (
        stream.lastEventTime &&
        stream.lastEventTime < cutoffTime &&
        stream.logStreamName
      ) {
        try {
          await cloudWatchClient.send(
            new DeleteLogStreamCommand({
              logGroupName,
              logStreamName: stream.logStreamName,
            }),
          );
          deletedCount += 1;
          console.log(
            `[CLEANUP_DELETED] Deleted log stream: ${stream.logStreamName}`,
          );
        } catch (error) {
          console.error(
            `[CLEANUP_ERROR] Failed to delete log stream ${stream.logStreamName}:`,
            error,
          );
        }
      }
    }

    console.log(
      `[CLEANUP_COMPLETE] Cleanup completed. Deleted ${deletedCount} log streams`,
    );
  } catch (error) {
    console.error('[CLEANUP_ERROR] Cleanup process failed:', error);
    throw error;
  }
};
