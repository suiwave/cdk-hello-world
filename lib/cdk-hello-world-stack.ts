import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';

import { readFileSync } from "fs";

export class CdkWorkshopStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'BlogVpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.1.0.0/16')
    })

    const webServer1 = new ec2.Instance(this, 'WordpressServer1', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      machineImage: new ec2.AmazonLinuxImage({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2 }),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    const script = readFileSync("./lib/resources/user-data.sh", "utf8");
    webServer1.addUserData(script);

    webServer1.connections.allowFromAnyIpv4(ec2.Port.HTTP)

    new CfnOutput(this, "WordpressServer1PublicIPAddress", {
      value: `http://${webServer1.instancePublicIp}`,
    });

    const t3Instance = new rds.DatabaseInstance(this, 'WordpressInstance', {
      engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_8_0_39 }),
      vpc,
      databaseName: 'wordpress',
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    t3Instance.connections.allowFrom(webServer1, ec2.Port.tcp(3306), 'Allow web server to connect to database');
  }
}