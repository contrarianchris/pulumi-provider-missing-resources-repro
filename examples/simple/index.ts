import * as xyz from "@pulumi/xyz";

const page = new xyz.StaticPage("page", {
    indexContent: "<html><body><p>Hello world!</p></body></html>",
});

const vpc = new xyz.Vpc("vpc", {
    availabilityZoneNames: ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d"],
    cidrBlock: "192.168.0.0/16",
    clusterName: "my-test-eks-cluster",
    tags: {
        test: "tag"
    }
})

export const bucket = page.bucket;
export const url = page.websiteUrl;
export const publicSubnetIds = vpc.publicSubnetIds;
