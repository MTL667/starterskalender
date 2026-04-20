import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client, ResponseType } from "@microsoft/microsoft-graph-client";

const authority = `https://login.microsoftonline.com/${process.env.AZURE_DOCS_TENANT_ID}`;

let cca: ConfidentialClientApplication | null = null;

function getClientApp(): ConfidentialClientApplication {
  if (!cca) {
    cca = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.AZURE_DOCS_CLIENT_ID!,
        clientSecret: process.env.AZURE_DOCS_CLIENT_SECRET!,
        authority,
      },
    });
  }
  return cca;
}

async function getToken(): Promise<string> {
  const app = getClientApp();
  const result = await app.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"],
  });

  if (!result?.accessToken) {
    throw new Error("Failed to acquire Microsoft Graph token for document storage");
  }

  return result.accessToken;
}

export async function graphDocs() {
  const token = await getToken();

  return Client.init({
    authProvider: (done) => {
      done(null, token);
    },
  });
}

export function isDocsGraphConfigured(): boolean {
  return !!(
    process.env.AZURE_DOCS_TENANT_ID &&
    process.env.AZURE_DOCS_CLIENT_ID &&
    process.env.AZURE_DOCS_CLIENT_SECRET &&
    process.env.TEAMS_SITE_ID
  );
}

function getSiteId(): string {
  return process.env.TEAMS_SITE_ID!;
}

function getDriveId(): string | undefined {
  return process.env.TEAMS_DRIVE_ID;
}

async function resolveDriveId(client: Client): Promise<string> {
  const driveId = getDriveId();
  if (driveId) return driveId;

  const drive = await client.api(`/sites/${getSiteId()}/drive`).get();
  return drive.id;
}

function buildStarterPath(entityName: string, starterLastName: string, starterFirstName: string): string {
  const safeName = (s: string) => s.replace(/[<>:"/\\|?*]/g, "_").trim();
  return `${safeName(entityName)}/${safeName(starterLastName)} ${safeName(starterFirstName)}`;
}

export async function uploadDocument(
  entityName: string,
  starterLastName: string,
  starterFirstName: string,
  fileName: string,
  content: Buffer,
  subFolder?: string
): Promise<{ driveId: string; itemId: string; webUrl: string; path: string }> {
  const client = await graphDocs();
  const driveId = await resolveDriveId(client);
  const safeName = (s: string) => s.replace(/[<>:"/\\|?*]/g, "_").trim();
  const folderPath = buildStarterPath(entityName, starterLastName, starterFirstName);
  const fullFolder = subFolder ? `${folderPath}/${safeName(subFolder)}` : folderPath;
  const filePath = `${fullFolder}/${fileName}`;

  const item = await client
    .api(`/drives/${driveId}/root:/${filePath}:/content`)
    .putStream(content);

  return {
    driveId,
    itemId: item.id,
    webUrl: item.webUrl,
    path: filePath,
  };
}

export async function downloadDocument(
  driveId: string,
  itemId: string
): Promise<Buffer> {
  const client = await graphDocs();
  const response = await client
    .api(`/drives/${driveId}/items/${itemId}/content`)
    .responseType(ResponseType.ARRAYBUFFER)
    .get();

  return Buffer.from(response);
}

export async function getPreviewUrl(
  driveId: string,
  itemId: string
): Promise<string> {
  const client = await graphDocs();
  const preview = await client
    .api(`/drives/${driveId}/items/${itemId}/preview`)
    .post({});
  return preview.getUrl;
}

export async function deleteDocument(
  driveId: string,
  itemId: string
): Promise<void> {
  const client = await graphDocs();
  await client.api(`/drives/${driveId}/items/${itemId}`).delete();
}

export async function listStarterDocuments(
  entityName: string,
  starterLastName: string,
  starterFirstName: string
): Promise<any[]> {
  const client = await graphDocs();
  const driveId = await resolveDriveId(client);
  const folderPath = buildStarterPath(entityName, starterLastName, starterFirstName);

  try {
    const result = await client
      .api(`/drives/${driveId}/root:/${folderPath}:/children`)
      .get();
    return result.value || [];
  } catch (err: any) {
    if (err.statusCode === 404) return [];
    throw err;
  }
}
