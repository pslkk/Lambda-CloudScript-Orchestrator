# Lambda-CloudScript-Orchestrator
Lambda CloudScript Orchestrator means a cloud-based system that uses AWS Lambda to centrally coordinate and execute different scripts (tasks) across multiple Lambda functions, enabling flexible, serverless, and automated workflow management in the cloud

How this works (Complete Workflow):

1) Main Local Server Initialization (Trigger):

  • mainlocalserver.js is executed on the main side using Node.js.
  • Action: Triggers the Main Lambda via an HTTP API call.
  • Input to Main Lambda: A request to initiate the network speed test.

2) Main Lambda - Initial Data Insertion:

  • Main Lambda receives the trigger.
  • Action: Generates a unique jobId.
  • Action: Inserts a payload (the scriptname to be executed on the client, e.g., "intspd.js") along with the jobId into firstTablename (DynamoDB).

3) Client Side Initialization (Trigger):

  • clientside.js is executed on the client side using Node.js.
  • Action: Triggers the Client Side Lambda via an HTTP API call.

4) Client Side Heartbeat and Payload Fetching:

  • clientside.js sends "heartbeat" (dummy data) to Client Side Lambda at regular intervals (default: 120 seconds).
  • Client Side Lambda receives the heartbeat.
  • Action (Client Side Lambda): Fetches for a payload (a scriptname) from firstTablename in a FIFO (First-In, First-Out) manner.
    • Condition: If no payload is found in firstTablename:
      • Action (Client Side Lambda): Returns "no data in queue waiting for data" to clientside.js.
    • Condition: If a payload (scriptname and jobId) is found:
      • Action (Client Side Lambda): Sends the scriptname and jobId to clientside.js.

5) Client Side Script Execution and Processing:

  • clientside.js receives the scriptname and jobId from Client Side Lambda.
  • Pre-requisite: The scriptname.js file (e.g., network_speed_test.js) must be present in the same directory as clientside.js.
  • Action (clientside.js): Spawns a child Node.js process to execute scriptname.js.
    • Note: scriptname.js should perform the network speed test and generate the desired result.
  • Action (clientside.js): Receives the processed data (network speed result) from the child process.
  • Action (clientside.js): Sends the processed data along with the original jobId back to Client Side Lambda via an HTTP API call.

6) Client Side Lambda - Result Insertion:

  • Client Side Lambda receives the processed data and jobId from clientside.js.
  • Action: Inserts the processed data and the jobId into secondTablename (DynamoDB).

7) Main Lambda - Result Polling and Delivery:

  • Concurrently with step 2, after inserting data into firstTablename, Main Lambda starts polling secondTablename for data with the specific unique jobId it generated.
  • Condition: Main Lambda attempts to fetch data for up to 10 minutes.
    • If data is found within 10 minutes:
      • Action (Main Lambda): Retrieves the processed data (network speed) from secondTablename.
      • Action (Main Lambda): Sends the processed data to the Main Local Server.
    • If no data is found after 10 minutes:
      • Action (Main Lambda): Sends a "timeout" message to the Main Local Server.

8) Main Local Server - Display Results:

  • mainlocalserver.js receives the data (network speed) or the "timeout" message from Main Lambda.
  • Action: If data is received, displays the network speed on a speedometer.
  • Action: If "timeout" is received, displays a "Timeout" message.
