import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";

const authority = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`;

const cca = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
    authority,
  },
});

async function getToken() {
  const result = await cca.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"],
  });
  if (!result?.accessToken) throw new Error("No Graph token");
  return result.accessToken;
}

export async function graph() {
  const token = await getToken();
  return Client.init({
    authProvider: (done) => done(null, token),
  });
}
