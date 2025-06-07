import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  DeleteCommand
} from "@aws-sdk/lib-dynamodb";
const clnt = new DynamoDBClient({});
const client = DynamoDBDocumentClient.from(clnt);
const TABLE_NAME = "firstTablename";
const DATA_TABLE = "secondTableName";

export const handler = async (event) => {
    try {
        let body = {};
        try {
            body = event.body ? JSON.parse(event.body) : {};
        } catch {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid JSON payload' })
            };
        }

        if (body.status === "heartbeat") {  
            const queryResult = await client.send(new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: "pk = :pk_val",
                ExpressionAttributeValues: {
                    ":pk_val": "queue"
                },
                Limit: 1,
                ScanIndexForward: true
            }));

            if (queryResult.Items && queryResult.Items.length > 0) {
                const itemToProcess = queryResult.Items[0];
                await client.send(new DeleteCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        pk: "queue",
                        timestamp: itemToProcess.timestamp
                    }
                }));
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        payload: itemToProcess.payload,
                        jobId: itemToProcess.jobId
                    }),
                    headers: { 'Content-Type': 'application/json' }
                };
            } else {
                return {
                    statusCode: 204,
                    body: JSON.stringify({ message: 'No data in queue.' })
                };
            }
        } else {
            const jobId = event.queryStringParameters && event.queryStringParameters.jobId;
            if (!jobId) {
                return {
                    statusCode: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: "Job ID is required as a query parameter." })
                };
            }
            const timestamp = new Date().getTime();
            await client.send(new PutCommand({
                TableName: DATA_TABLE,
                Item: {
                    pk: "data",
                    timestamp: timestamp,
                    jobId: jobId,
                    payload: JSON.stringify(body)
                }
            }));
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Data stored successfully!' })
            };
        }
    } catch (error) {
        console.error("Error processing request:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error', error: error.message })
        };
    }
};
