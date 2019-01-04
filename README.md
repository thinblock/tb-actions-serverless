# transaction serverless

ThinBlock's Transaction API is built using AWS Lambda and Serverless. It depends on NodeJS server `v8.10`.

## Installation
We use `yarn` to install the packages. Do
```
 yarn install
```

## Deploy
In order to deploy offline, simply run
```bash
serverless offline start
```

In order to deploy the you endpoint simply run

```bash
serverless deploy
```

The expected result should be similar to:

```bash
Serverless: Packaging service…
Serverless: Uploading CloudFormation file to S3…
Serverless: Uploading service .zip file to S3…
Serverless: Updating Stack…
Serverless: Checking Stack update progress…
...........................
Serverless: Stack update finished…

Service Information
service: serverless-simple-http-endpoint
stage: dev
region: us-east-1
api keys:
  None
endpoints:
  GET - https://2e16njizla.execute-api.us-east-1.amazonaws.com/dev/transaction
functions:
  serverless-simple-http-endpoint-dev-transaction: arn:aws:lambda:us-east-1:488110005556:function:serverless-simple-http-endpoint-dev-transaction
```

## Usage

You can now invoke the Lambda directly and even see the resulting log via

```bash
serverless invoke --function transaction --log
```

or as send an HTTP request directly to the endpoint using a tool like curl

```bash
curl https://XXXXXXX.execute-api.us-east-1.amazonaws.com/dev/transaction
```

## File Structure
```
handler.js (Contains pure functions exported)
serverless.yml (Defines paths and functions with parameters)
package.json
```
