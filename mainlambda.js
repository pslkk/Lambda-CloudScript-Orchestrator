import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const headers = event.headers || {};
    const contentType = headers['content-type'] || headers['Content-Type'];
    const isDataIngest = event.body && contentType.toLowerCase() === 'application/json';

    if (!isDataIngest) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Invalid request: Expected 'Content-Type: application/json' with a body." })
      };
    }
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (parseErr) {
      console.error("JSON parsing error in initial request:", parseErr);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Invalid JSON in request body.", error: parseErr.message })
      };
    }

    const jobId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date().getTime();
      try {
        await ddbDocClient.send(new PutCommand({
          TableName: "firstTablename",
          Item: {
            pk: "queue",
            timestamp: timestamp,
            jobId: jobId,
            payload: JSON.stringify(data),
            createdAt: new Date().toISOString()
          }
        }));
        return {
          statusCode: 202, // Accepted
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              message: "Request accepted for processing.",
              jobId: jobId,
              statusEndpoint: "/results?jobId=" + jobId
          })
        };
      } catch (putErr) {
        console.error("Failed to add item to firstTablename queue:", putErr);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              message: "Failed to queue your request for processing.",
              error: putErr.message
          })
        };
      }
  } catch (error) {
    console.error('Error stateless data', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error', error: error.message, stack: error.stack })
    };
  }
};
