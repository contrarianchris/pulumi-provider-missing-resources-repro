// *** WARNING: this file was generated by Pulumi SDK Generator. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

import * as pulumi from "@pulumi/pulumi";
import * as utilities from "./utilities";

import * as pulumiAws from "@pulumi/aws";

export class Vpc extends pulumi.ComponentResource {
    /** @internal */
    public static readonly __pulumiType = 'xyz:index:Vpc';

    /**
     * Returns true if the given object is an instance of Vpc.  This is designed to work even
     * when multiple copies of the Pulumi SDK have been loaded into the same process.
     */
    public static isInstance(obj: any): obj is Vpc {
        if (obj === undefined || obj === null) {
            return false;
        }
        return obj['__pulumiType'] === Vpc.__pulumiType;
    }

    /**
     * List of IDs for the VPC's EKS Control Plane subnets.
     */
    public /*out*/ readonly controlPlaneSubnetIds!: pulumi.Output<string[]>;
    /**
     * List of IDs for the VPC's private subnets.
     */
    public /*out*/ readonly privateSubnetIds!: pulumi.Output<string[]>;
    /**
     * List of IDs for the VPC's public subnets.
     */
    public /*out*/ readonly publicSubnetIds!: pulumi.Output<string[]>;
    /**
     * The VPC resource.
     */
    public /*out*/ readonly vpcResource!: pulumi.Output<pulumiAws.ec2.Vpc>;

    /**
     * Create a Vpc resource with the given unique name, arguments, and options.
     *
     * @param name The _unique_ name of the resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param opts A bag of options that control this resource's behavior.
     */
    constructor(name: string, args: VpcArgs, opts?: pulumi.ComponentResourceOptions) {
        let resourceInputs: pulumi.Inputs = {};
        opts = opts || {};
        if (!opts.id) {
            if ((!args || args.availabilityZoneNames === undefined) && !opts.urn) {
                throw new Error("Missing required property 'availabilityZoneNames'");
            }
            if ((!args || args.cidrBlock === undefined) && !opts.urn) {
                throw new Error("Missing required property 'cidrBlock'");
            }
            if ((!args || args.clusterName === undefined) && !opts.urn) {
                throw new Error("Missing required property 'clusterName'");
            }
            if ((!args || args.tags === undefined) && !opts.urn) {
                throw new Error("Missing required property 'tags'");
            }
            resourceInputs["availabilityZoneNames"] = args ? args.availabilityZoneNames : undefined;
            resourceInputs["cidrBlock"] = args ? args.cidrBlock : undefined;
            resourceInputs["clusterName"] = args ? args.clusterName : undefined;
            resourceInputs["tags"] = args ? args.tags : undefined;
            resourceInputs["controlPlaneSubnetIds"] = undefined /*out*/;
            resourceInputs["privateSubnetIds"] = undefined /*out*/;
            resourceInputs["publicSubnetIds"] = undefined /*out*/;
            resourceInputs["vpcResource"] = undefined /*out*/;
        } else {
            resourceInputs["controlPlaneSubnetIds"] = undefined /*out*/;
            resourceInputs["privateSubnetIds"] = undefined /*out*/;
            resourceInputs["publicSubnetIds"] = undefined /*out*/;
            resourceInputs["vpcResource"] = undefined /*out*/;
        }
        opts = pulumi.mergeOptions(utilities.resourceOptsDefaults(), opts);
        super(Vpc.__pulumiType, name, resourceInputs, opts, true /*remote*/);
    }
}

/**
 * The set of arguments for constructing a Vpc resource.
 */
export interface VpcArgs {
    /**
     * The list of target availability zone names.
     */
    availabilityZoneNames: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * The IP CIDR block for the dedicated EKS VPC network.
     */
    cidrBlock: pulumi.Input<string>;
    /**
     * The name for the deployed EKS cluster.
     */
    clusterName: pulumi.Input<string>;
    /**
     * Tags to apply to all child resources.
     */
    tags: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
}
