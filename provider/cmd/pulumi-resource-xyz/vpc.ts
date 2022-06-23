import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

/**
 * Component Input Arguments
 */
export interface VpcArgs {
  availabilityZoneNames: string[];
  cidrBlock: string;
  clusterName: string;
  tags: {
    [key: string]: string;
  };
}

/**
 * Pulumi Component Resource that encapsulates provisioning of an EKS-dedicated VPC.
 */
export class Vpc extends pulumi.ComponentResource {
  public readonly vpcResource: aws.ec2.Vpc;
  public readonly publicSubnetIds: pulumi.Output<pulumi.Output<string>[]>;
  public readonly controlPlaneSubnetIds: pulumi.Output<pulumi.Output<string>[]>;
  public readonly privateSubnetIds: pulumi.Output<pulumi.Output<string>[]>;

  private readonly args: VpcArgs;
  private readonly projectName: string;
  private readonly stackName: string;

  private readonly vpcName: string;
  private readonly internetGatewayName: string;
  private readonly publicSubnetName: string;
  private readonly publicRouteTableName: string;
  private readonly publicDefaultRouteName: string;
  private readonly publicRouteTableAssociationName: string;
  private readonly natGatewayElasticIpName: string;
  private readonly natGatewayName: string;
  private readonly controlPlaneSubnetName: string;
  private readonly controlPlaneRouteTableName: string;
  private readonly controlPlaneDefaultRouteName: string;
  private readonly controlPlaneRouteTableAssociationName: string;
  private readonly privateSubnetName: string;
  private readonly privateRouteTableName: string;
  private readonly privateDefaultRouteName: string;
  private readonly privateRouteTableAssociationName: string;

  private readonly internetGateway: aws.ec2.InternetGateway;
  private readonly publicRouteTable: aws.ec2.DefaultRouteTable;
  private readonly natGateways: pulumi.Output<aws.ec2.NatGateway[]>;
  private readonly publicSubnets: pulumi.Output<aws.ec2.Subnet[]>;
  private readonly controlPlaneSubnets: pulumi.Output<aws.ec2.Subnet[]>;
  private readonly privateSubnets: pulumi.Output<aws.ec2.Subnet[]>;

  constructor(name: string, args: VpcArgs, opts?: pulumi.ComponentResourceOptions) {
    super("xyz:index:Vpc", name, args, opts);

    this.args = args;
    this.projectName = pulumi.getProject();
    this.stackName = pulumi.getStack();

    this.vpcName = `${this.projectName}-${this.stackName}-vpc`;
    this.internetGatewayName = `${this.projectName}-${this.stackName}-igw`;
    this.publicSubnetName = `${this.projectName}-${this.stackName}-public-subnet`;
    this.publicRouteTableName = `${this.projectName}-${this.stackName}-public-rt`;
    this.publicDefaultRouteName = `${this.projectName}-${this.stackName}-public-route`;
    this.publicRouteTableAssociationName = `${this.projectName}-${this.stackName}-public-rt-association`;
    this.natGatewayElasticIpName = `${this.projectName}-${this.stackName}-natgw-eip`;
    this.natGatewayName = `${this.projectName}-${this.stackName}-natgw`;
    this.controlPlaneSubnetName = `${this.projectName}-${this.stackName}-eks-subnet`;
    this.controlPlaneRouteTableName = `${this.projectName}-${this.stackName}-eks-rt`;
    this.controlPlaneDefaultRouteName = `${this.projectName}-${this.stackName}-eks-nat-route`;
    this.controlPlaneRouteTableAssociationName = `${this.projectName}-${this.stackName}-eks-rt-association`;
    this.privateSubnetName = `${this.projectName}-${this.stackName}-private-subnet`;
    this.privateRouteTableName = `${this.projectName}-${this.stackName}-private-rt`;
    this.privateDefaultRouteName = `${this.projectName}-${this.stackName}-private-nat-route`;
    this.privateRouteTableAssociationName = `${this.projectName}-${this.stackName}-private-rt-association`;

    this.vpcResource = this.createVpc();
    this.internetGateway = this.createInternetGateway();
    this.publicRouteTable = this.createPublicRouteTable();
    [this.publicSubnets, this.natGateways] = this.createPublicNetworking();
    this.controlPlaneSubnets = this.createControlPlaneNetworking();
    this.privateSubnets = this.createPrivateNetworking();

    this.publicSubnetIds = pulumi.all([this.publicSubnets]).apply(([subnets]) => {
      return subnets.map((subnet) => subnet.id);
    });
    this.controlPlaneSubnetIds = pulumi.all([this.controlPlaneSubnets]).apply(([subnets]) => {
      return subnets.map((subnet) => subnet.id);
    });
    this.privateSubnetIds = pulumi.all([this.privateSubnets]).apply(([subnets]) => {
      return subnets.map((subnet) => subnet.id);
    });

    this.registerOutputs({
      vpcResource: this.vpcResource,
      publicSubnetIds: this.publicSubnetIds,
      controlPlaneSubnetIds: this.controlPlaneSubnetIds,
      privateSubnetIds: this.privateSubnetIds,
    });
  }

  private createVpc = (): aws.ec2.Vpc => {
    return new aws.ec2.Vpc(
      this.vpcName,
      {
        cidrBlock: this.args.cidrBlock,
        tags: {
          Name: this.vpcName,
          ...this.args.tags,
        },
      },
      { parent: this }
    );
  };

  private createInternetGateway = (): aws.ec2.InternetGateway => {
    return new aws.ec2.InternetGateway(
      this.internetGatewayName,
      {
        vpcId: this.vpcResource.id,
        tags: {
          Name: this.internetGatewayName,
          ...this.args.tags,
        },
      },
      { parent: this.vpcResource, dependsOn: this.vpcResource }
    );
  };

  private createPublicRouteTable = (): aws.ec2.DefaultRouteTable => {
    const routeTable = new aws.ec2.DefaultRouteTable(
      this.publicRouteTableName,
      {
        defaultRouteTableId: this.vpcResource.defaultRouteTableId,
        tags: {
          Name: this.publicRouteTableName,
          ...this.args.tags,
        },
      },
      { parent: this.vpcResource, dependsOn: this.vpcResource }
    );

    new aws.ec2.Route(
      this.publicDefaultRouteName,
      {
        routeTableId: routeTable.id,
        destinationCidrBlock: "0.0.0.0/0",
        gatewayId: this.internetGateway.id,
      },
      { parent: routeTable, dependsOn: [this.internetGateway, routeTable] }
    );

    return routeTable;
  };

  private createPublicNetworking = (): [pulumi.Output<aws.ec2.Subnet[]>, pulumi.Output<aws.ec2.NatGateway[]>] => {
    const publicSubnets: aws.ec2.Subnet[] = [];
    const natGateways: aws.ec2.NatGateway[] = [];
    const cidrPrefix = this.args.cidrBlock.split(".").slice(0, 2).join(".");

    this.args.availabilityZoneNames.forEach((zoneName, index) => {
      const subnet = new aws.ec2.Subnet(
        `${this.publicSubnetName}-${index}`,
        {
          vpcId: this.vpcResource.id,
          cidrBlock: `${cidrPrefix}.${(index + 8) * 16}.0/20`,
          availabilityZone: zoneName,
          tags: {
            Name: `${this.publicSubnetName}-${index}`,
            [`kubernetes.io/cluster/${this.args.clusterName}`]: "owned",
            "kubernetes.io/role/elb": "1",

            ...this.args.tags,
          },
        },
        { parent: this.vpcResource, dependsOn: this.vpcResource }
      );
      publicSubnets.push(subnet);

      new aws.ec2.RouteTableAssociation(
        `${this.publicRouteTableAssociationName}-${index}`,
        {
          routeTableId: this.publicRouteTable.id,
          subnetId: subnet.id,
        },
        { parent: this.publicRouteTable, dependsOn: [this.publicRouteTable, subnet] }
      );

      const eip = new aws.ec2.Eip(
        `${this.natGatewayElasticIpName}-${index}`,
        {
          vpc: true,
          tags: {
            Name: `${this.natGatewayElasticIpName}-${index}`,
            ...this.args.tags,
          },
        },
        { parent: this.vpcResource, dependsOn: this.vpcResource }
      );

      const natGateway = new aws.ec2.NatGateway(
        `${this.natGatewayName}-${index}`,
        {
          subnetId: subnet.id,
          allocationId: eip.id,
          tags: {
            Name: `${this.natGatewayName}-${index}`,
            ...this.args.tags,
          },
        },
        { parent: subnet, dependsOn: [subnet, eip] }
      );
      natGateways.push(natGateway);
    });

    return [pulumi.output(publicSubnets), pulumi.output(natGateways)];
  };

  private createControlPlaneNetworking = (): pulumi.Output<aws.ec2.Subnet[]> => {
    const controlPlaneSubnets: aws.ec2.Subnet[] = [];
    const cidrPrefix = this.args.cidrBlock.split(".").slice(0, 2).join(".");

    this.args.availabilityZoneNames.forEach((zoneName, index) => {
      const subnet = new aws.ec2.Subnet(
        `${this.controlPlaneSubnetName}-${index}`,
        {
          vpcId: this.vpcResource.id,
          cidrBlock: `${cidrPrefix}.0.${index * 16}/28`,
          availabilityZone: zoneName,
          tags: {
            Name: `${this.controlPlaneSubnetName}-${index}`,
            ...this.args.tags,
          },
        },
        { parent: this.vpcResource, dependsOn: this.vpcResource }
      );
      controlPlaneSubnets.push(subnet);

      const routeTable = new aws.ec2.RouteTable(
        `${this.controlPlaneRouteTableName}-${index}`,
        {
          vpcId: this.vpcResource.id,
          tags: {
            Name: `${this.controlPlaneRouteTableName}-${index}`,
            ...this.args.tags,
          },
        },
        { parent: this.vpcResource, dependsOn: this.vpcResource }
      );

      new aws.ec2.Route(
        `${this.controlPlaneDefaultRouteName}-${index}`,
        {
          routeTableId: routeTable.id,
          destinationCidrBlock: "0.0.0.0/0",
          natGatewayId: this.natGateways[index].id,
        },
        { parent: routeTable, dependsOn: [routeTable, this.natGateways[index]] }
      );

      new aws.ec2.RouteTableAssociation(
        `${this.controlPlaneRouteTableAssociationName}-${index}`,
        {
          routeTableId: routeTable.id,
          subnetId: subnet.id,
        },
        { parent: routeTable, dependsOn: [routeTable, subnet] }
      );
    });

    return pulumi.output(controlPlaneSubnets);
  };

  private createPrivateNetworking = (): pulumi.Output<aws.ec2.Subnet[]> => {
    const privateSubnets: aws.ec2.Subnet[] = [];
    const cidrPrefix = this.args.cidrBlock.split(".").slice(0, 2).join(".");

    this.args.availabilityZoneNames.forEach((zoneName, index) => {
      const subnet = new aws.ec2.Subnet(
        `${this.privateSubnetName}-${index}`,
        {
          vpcId: this.vpcResource.id,
          cidrBlock: `${cidrPrefix}.${(index + 1) * 16}.0/20`,
          availabilityZone: zoneName,
          tags: {
            Name: `${this.privateSubnetName}-${index}`,
            [`kubernetes.io/cluster/${this.args.clusterName}`]: "owned",
            "kubernetes.io/role/internal-elb": "1",

            ...this.args.tags,
          },
        },
        { parent: this.vpcResource, dependsOn: this.vpcResource }
      );
      privateSubnets.push(subnet);

      const routeTable = new aws.ec2.RouteTable(
        `${this.privateRouteTableName}-${index}`,
        {
          vpcId: this.vpcResource.id,
          tags: {
            Name: `${this.privateRouteTableName}-${index}`,
            ...this.args.tags,
          },
        },
        { parent: this.vpcResource, dependsOn: this.vpcResource }
      );

      new aws.ec2.Route(
        `${this.privateDefaultRouteName}-${index}`,
        {
          routeTableId: routeTable.id,
          destinationCidrBlock: "0.0.0.0/0",
          natGatewayId: this.natGateways[index].id,
        },
        { parent: routeTable, dependsOn: [routeTable, this.natGateways[index]] }
      );

      new aws.ec2.RouteTableAssociation(
        `${this.privateRouteTableAssociationName}-${index}`,
        {
          routeTableId: routeTable.id,
          subnetId: subnet.id,
        },
        { parent: routeTable, dependsOn: [routeTable, subnet] }
      );
    });

    return pulumi.output(privateSubnets);
  };
}
