# Lambda-CloudScript-Orchestrator

Note: This repository is designed for much more than just network speed tests! It's a versatile framework where you can design and execute virtually any client-side task. Simply create your custom JavaScript files (e.g., abcd.js, xyz.js) and add their script names (like "abcd" or "xyz") to the options list within your index.html file. The system will then seamlessly dispatch and run these custom scripts on the client side, giving you immense flexibility in defining your remote operations.

My Workflow: Client Network Speed Measurement via AWS Lambda and DynamoDB
  - This workflow automates the measurement of client-side network speed and displays the results on a main local server, leveraging AWS Lambda for serverless processing and DynamoDB for inter-process communication.

Workflow Goal: To measure the network speed of a remote client and display it on a speedometer interface on a central main local server.

Actors:

  - Main Local Server: mainlocalserver.js (Node.js application)
  - index.html
  - Main Lambda: AWS Lambda function
  - Client Side: clientside.js (Node.js application)
  - Client Side Lambda: AWS Lambda function
  - DynamoDB Table 1: firstTablename (e.g., ClientTaskQueue)
  - DynamoDB Table 2: secondTablename (e.g., ClientResults)
  - Script Name Files: scriptname.js (e.g., intspd.js, latency_test.js, etc.)
  
Prerequisites and Setup:

  - Before running the workflow, ensure the following are set up:
  - Node.js Installation:

    - Install Node.js on both your "main side" and "client side" machines if you haven't already.

  - Axios Installation:
    
    - axios is a promise-based HTTP client for the browser and Node.js. It will be used for making HTTP API calls to your Lambda functions.

    - On both the Main Side and Client Side: Navigate to your project directory (where mainlocalserver.js is and where clientside.js is, respectively) in your command prompt/terminal.
    - Run the following command to install axios: -npm install axios
      
  - AWS Account and CLI (Optional but Recommended):

    - Ensure you have an AWS account and have configured your AWS CLI (Command Line Interface) with appropriate credentials. This is useful for managing Lambda functions and DynamoDB tables.
    
    - DynamoDB Table Creation:

      - You need two DynamoDB tables. While the names firstTablename and secondTablename are placeholders, you can change them as per your requirements (e.g., ClientTaskQueue and ClientResults).
        
      - firstTablename (e.g., ClientTaskQueue):
        - Purpose: Acts as a queue for tasks (scripts) to be executed by clients.
        - Primary Key (PK): jobId (String) - A unique identifier for each task.
        - Sort Key (SK): timestamp (Number) - To ensure FIFO processing (First-In, First-Out) of tasks based on when they were added.
      - secondTablename (e.g., ClientResults):
        - Purpose: Stores the processed results sent back by the clients.
        - Primary Key (PK): jobId (String) - To link results back to the original task.
        - Sort Key (SK): timestamp (Number) - To track when the result was recorded.

  - AWS Lambda Functions Deployment:

    - Deploy your Main Lambda and Client Side Lambda functions to AWS Lambda.
    - Ensure they are configured with HTTP API Gateway triggers.
    - Grant appropriate IAM permissions for both Lambda functions to interact with your DynamoDB tables (read/write access to their respective tables).

    - Client-Side Script Files (.js):

      - Create the JavaScript files that will contain the logic for the network speed tests or other client-side operations (e.g., network_speed_test.js, latency_test.js).
      - Important: Place these scriptname.js files in the same folder/project directory where your clientside.js file is located on the client machine.

    - Main Local Server Configuration (mainlocalserver.js / index.js):

      - Your mainlocalserver.js (or a configuration file it reads, potentially named index.js as you mentioned) will need to include an "options" section or array where you specify the scriptname strings that you want to send to the client.
      - For example, you might have an array like ['intspd.js', 'latency_test.js'] that the mainlocalserver.js iterates through to trigger tasks. This allows you to run as many different scripts as needed.

How this works (Complete Workflow):

- Main Local Server Initialization (Trigger):

  - mainlocalserver.js is executed on the main side using Node.js.
  - Action: Triggers the Main Lambda via an HTTP API call.
  - Input to Main Lambda: A request to initiate the network speed test.

- Main Lambda - Initial Data Insertion:

  - Main Lambda receives the trigger.
  - Action: Generates a unique jobId.
  - Action: Inserts a payload (the scriptname to be executed on the client, e.g., "intspd.js") along with the jobId into firstTablename (DynamoDB).

- Client Side Initialization (Trigger):

  - clientside.js is executed on the client side using Node.js.
  - Action: Triggers the Client Side Lambda via an HTTP API call.

- Client Side Heartbeat and Payload Fetching:

  - clientside.js sends "heartbeat" (dummy data) to Client Side Lambda at regular intervals (default: 120 seconds).
  - Client Side Lambda receives the heartbeat.
  - Action (Client Side Lambda): Fetches for a payload (a scriptname) from firstTablename in a FIFO (First-In, First-Out) manner.
    - Condition: If no payload is found in firstTablename:
      - Action (Client Side Lambda): Returns "no data in queue waiting for data" to clientside.js.
    - Condition: If a payload (scriptname and jobId) is found:
      - Action (Client Side Lambda): Sends the scriptname and jobId to clientside.js.

- Client Side Script Execution and Processing:

  - clientside.js receives the scriptname and jobId from Client Side Lambda.
  - Pre-requisite: The scriptname.js file (e.g., network_speed_test.js) must be present in the same directory as clientside.js.
  - Action (clientside.js): Spawns a child Node.js process to execute scriptname.js.
    - Note: scriptname.js should perform the network speed test and generate the desired result.
  - Action (clientside.js): Receives the processed data (network speed result) from the child process.
  - Action (clientside.js): Sends the processed data along with the original jobId back to Client Side Lambda via an HTTP API call.

- Client Side Lambda - Result Insertion:

  - Client Side Lambda receives the processed data and jobId from clientside.js.
  - Action: Inserts the processed data and the jobId into secondTablename (DynamoDB).

- Main Lambda - Result Polling and Delivery:

  - Concurrently with step 2, after inserting data into firstTablename, Main Lambda starts polling secondTablename for data with the specific unique jobId it generated.
  - Condition: Main Lambda attempts to fetch data for up to 10 minutes.
    - If data is found within 10 minutes:
      - Action (Main Lambda): Retrieves the processed data (network speed) from secondTablename.
      - Action (Main Lambda): Sends the processed data to the Main Local Server.
    - If no data is found after 10 minutes:
      - Action (Main Lambda): Sends a "timeout" message to the Main Local Server.

- Main Local Server - Display Results:

  - mainlocalserver.js receives the data (network speed) or the "timeout" message from Main Lambda.
  - Action: If data is received, displays the network speed on a speedometer.
  - Action: If "timeout" is received, displays a "Timeout" message.

//---------------------------------------------------------------------------------END------------------------------------------------------------------------------------//
