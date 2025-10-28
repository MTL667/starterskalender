import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";

const authority = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`;

let cca: ConfidentialClientApplication | null = null;

function getClientApp(): ConfidentialClientApplication {
  if (!cca) {
    cca = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.AZURE_CLIENT_ID!,
        clientSecret: process.env.AZURE_CLIENT_SECRET!,
        authority,
      },
    });
  }
  return cca;
}

/**
 * Get Microsoft Graph access token using Client Credentials flow
 * Requires: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
 */
async function getToken(): Promise<string> {
  const app = getClientApp();
  const result = await app.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"],
  });

  if (!result?.accessToken) {
    throw new Error("Failed to acquire Microsoft Graph token");
  }

  return result.accessToken;
}

/**
 * Get an authenticated Microsoft Graph client
 */
export async function graph() {
  const token = await getToken();
  
  return Client.init({
    authProvider: (done) => {
      done(null, token);
    },
  });
}

/**
 * Check if Microsoft Graph is configured
 */
export function isGraphConfigured(): boolean {
  return !!(
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET
  );
}

