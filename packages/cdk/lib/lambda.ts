import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const HTTP_LAMBDA_FUNCTION_NAME = "slack-http";
    const HTTP_WORKER_FUNCTION_NAME = "slack-worker";

    const httpLambdaFunctionRole = new cdk.aws_iam.Role(
      this,
      "HttpLambdaFunctionRole",
      {
        assumedBy: new cdk.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
        ],
      }
    );

    httpLambdaFunctionRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: ["*"],
      })
    );

    const httpLambdaFunction = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "HttpLambdaFunction",
      {
        functionName: HTTP_LAMBDA_FUNCTION_NAME,
        runtime: cdk.aws_lambda.Runtime.NODEJS_22_X,
        entry: "../lambda/src/http.ts",
        handler: "handler",
        environment: {
          SLACK_SIGNING_SECRET: "PLACEHOLDER",
          HTTP_WORKER_FUNCTION_NAME,
        },
        role: httpLambdaFunctionRole,
        logGroup: new cdk.aws_logs.LogGroup(this, "HttpLambdaFunctionLog", {
          logGroupName: "/aws/lambda/slack-http",
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      }
    );

    const httpLambdaFunctionUrl = new cdk.aws_lambda.FunctionUrl(
      this,
      "HttpLambdaFunctionUrl",
      {
        function: httpLambdaFunction,
        authType: cdk.aws_lambda.FunctionUrlAuthType.NONE,
      }
    );

    void new cdk.CfnOutput(this, "URL", { value: httpLambdaFunctionUrl.url });

    const _workerLambdaFunction = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "WorkerLambdaFunction",
      {
        functionName: HTTP_WORKER_FUNCTION_NAME,
        runtime: cdk.aws_lambda.Runtime.NODEJS_22_X,
        entry: "../lambda/src/worker.ts",
        handler: "handler",
        timeout: cdk.Duration.minutes(1),
        logGroup: new cdk.aws_logs.LogGroup(this, "WorkerLambdaFunctionLog", {
          logGroupName: "/aws/lambda/slack-worker",
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      }
    );
  }
}
