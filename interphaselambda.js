import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { QueryCommand, DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const jobId = event.queryStringParameters?.jobId;
    if (!jobId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Job ID is required as a query parameter." })
      };
    }

    let queryResult;
    try {
      queryResult = await ddbDocClient.send(new QueryCommand({
        TableName: "secondTablename",
        KeyConditionExpression: "pk = :pk_val",
        FilterExpression: "jobId = :jobId_val",
        ExpressionAttributeValues: {
          ":pk_val": "data",
          ":jobId_val": jobId
        },
        Limit: 1,
        ScanIndexForward: true
      }));
    } catch (queryErr) {
      console.error(`Error querying secondTablename for jobId ${jobId}:`, queryErr);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Failed to query for result.",
          error: queryErr.message
        })
      };
    }

    if (queryResult?.Items && queryResult.Items.length > 0) {
      const foundItem = queryResult.Items[0];
      try {
        await ddbDocClient.send(new DeleteCommand({
          TableName: "secondTablename",
          Key: {
            pk: "data",
            timestamp: foundItem.timestamp
          }
        }));
        console.log(`Deleted result for Job ID: ${jobId} from secondTablename.`);
      } catch (deleteErr) {
        console.error(`Failed to delete item for jobId ${jobId} from secondTablename:`, deleteErr);
      }
      let payload = foundItem.payload;
      try {
        payload = JSON.parse(foundItem.payload);
      } catch (e) {
        console.warn(`Payload for jobId ${jobId} is not valid JSON, returning as is.`, e);
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      };
    } else {
      return {
        statusCode: 202, // Accepted - processing is still ongoing
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Processing in progress or no result yet. Please try again shortly." })
      };
    }
  } catch (error) {
    console.error('Unhandled error in resultPollingHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error', error: error.message, stack: error.stack })
    };
  }
};