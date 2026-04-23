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

function safeName(s: string): string {
  // Strip path-unsafe chars AND parent-dir traversal sequences. Trim whitespace.
  return s.replace(/[<>:"/\\|?*]/g, "_").replace(/\.{2,}/g, "_").trim();
}

function buildStarterPath(entityName: string, starterLastName: string, starterFirstName: string): string {
  return `${safeName(entityName)}/${safeName(starterLastName)} ${safeName(starterFirstName)}`;
}

// Graph accepteert Unicode in paden maar we encoden de onderdelen om te voorkomen
// dat karakters als `#`, `?`, `:` of spaties de API-URL breken.
function encodePathSegments(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

// Alleen deze mime types serveren we als profielfoto. SVG en HTML-achtige types
// zijn bewust uitgesloten: een inline `<script>` in SVG zou stored XSS geven
// omdat de photo proxy op same-origin draait.
const SAFE_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/bmp",
  "image/tiff",
]);

export function isSafeImageMimeType(mime: string | null | undefined): boolean {
  if (!mime) return false;
  // Graph retourneert soms parameters (`image/jpeg; charset=binary`); strip ze.
  const bare = mime.split(";")[0].trim().toLowerCase();
  return SAFE_IMAGE_MIME_TYPES.has(bare);
}

// Centrale mapping voor Graph/SDK-fouten naar HTTP statuscodes. Gebruikt door
// alle photo-gerelateerde API routes zodat clients consistente status codes
// zien ongeacht welke endpoint ze raken.
export type GraphLikeError = { statusCode?: number; code?: string; message?: string };

export function graphErrorToStatus(err: GraphLikeError): number {
  const s = err?.statusCode;
  if (s === 404) return 404;
  if (s === 401 || s === 403) return 502; // upstream auth failure ≠ client forbidden
  if (typeof s === "number" && s >= 400 && s < 600) return 502;
  return 500;
}

// Plafond voor `@odata.nextLink` pagination om OOM / unbounded fetches te
// voorkomen. Bij folders met honderden pagina's willen we liever een
// gecontroleerde 502 dan een crashend proces.
const MAX_PAGINATION_PAGES = 50;
const MAX_PAGINATION_ITEMS = 10_000;

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
    .api(`/drives/${driveId}/root:/${encodePathSegments(filePath)}:/content`)
    .putStream(content);

  return {
    driveId,
    itemId: item.id,
    webUrl: item.webUrl,
    path: filePath,
  };
}

// Haalt item-metadata op aan de hand van een volledig pad (bv. opgeslagen in
// StarterTaskUpload.sharePointPath). Nuttig om `driveId`/`itemId` te backfillen
// voor uploads die v\u00f3\u00f3r die kolommen werden opgeslagen.
export async function getItemByPath(
  filePath: string
): Promise<{ driveId: string; itemId: string; webUrl: string } | null> {
  const client = await graphDocs();
  const driveId = await resolveDriveId(client);
  try {
    const item = await client
      .api(`/drives/${driveId}/root:/${encodePathSegments(filePath)}`)
      .get();
    return { driveId, itemId: item.id, webUrl: item.webUrl };
  } catch (err: any) {
    if (err.statusCode === 404) return null;
    throw err;
  }
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

async function fetchAllPages(client: Client, initialPath: string): Promise<any[]> {
  const items: any[] = [];
  let page: any = await client.api(initialPath).get();
  items.push(...(page?.value || []));

  let pageCount = 1;
  let lastLink: string | undefined;
  while (page?.["@odata.nextLink"]) {
    const nextLink: string = page["@odata.nextLink"];
    // Bescherming tegen self-referential nextLink loops of runaway pagination.
    if (nextLink === lastLink) break;
    if (pageCount >= MAX_PAGINATION_PAGES || items.length >= MAX_PAGINATION_ITEMS) {
      console.warn(
        `Graph pagination cap bereikt (pages=${pageCount}, items=${items.length}); resterende resultaten worden genegeerd.`,
      );
      break;
    }
    lastLink = nextLink;
    page = await client.api(nextLink).get();
    items.push(...(page?.value || []));
    pageCount++;
  }
  return items;
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
    return await fetchAllPages(
      client,
      `/drives/${driveId}/root:/${encodePathSegments(folderPath)}:/children`,
    );
  } catch (err: any) {
    if (err.statusCode === 404) return [];
    throw err;
  }
}

// Platte lijst van alle afbeeldingen in de starter-map + directe submappen.
// Gebruikt voor de "profielfoto kiezen" flow — headshots worden normaal onder
// /marketing/ opgeslagen maar kunnen ook handmatig op andere plekken staan.
export type StarterImage = {
  driveId: string;
  itemId: string;
  fileName: string;
  folder: string; // relatief pad tov de starter-map ("" voor root, "marketing" voor submap)
  mimeType: string;
  sizeBytes: number;
  lastModified: string;
  webUrl: string;
};

export async function listStarterImages(
  entityName: string,
  starterLastName: string,
  starterFirstName: string
): Promise<StarterImage[]> {
  const client = await graphDocs();
  const driveId = await resolveDriveId(client);
  const folderPath = buildStarterPath(entityName, starterLastName, starterFirstName);

  const mapItem = (item: any, folder: string): StarterImage | null => {
    if (item.folder) return null;
    const mimeType = item.file?.mimeType || "";
    // Alleen veilige image types — SVG en andere potentieel uitvoerbare formats
    // worden bewust overgeslagen om stored XSS te voorkomen.
    if (!isSafeImageMimeType(mimeType)) return null;
    return {
      driveId,
      itemId: item.id,
      fileName: item.name,
      folder,
      mimeType,
      sizeBytes: item.size || 0,
      lastModified: item.lastModifiedDateTime || item.createdDateTime || "",
      webUrl: item.webUrl || "",
    };
  };

  const listChildren = async (path: string): Promise<any[]> => {
    try {
      return await fetchAllPages(
        client,
        `/drives/${driveId}/root:/${encodePathSegments(path)}:/children`,
      );
    } catch (err: any) {
      if (err.statusCode === 404) return [];
      throw err;
    }
  };

  const rootChildren = await listChildren(folderPath);

  const images: StarterImage[] = []
  for (const child of rootChildren) {
    const mapped = mapItem(child, "");
    if (mapped) images.push(mapped);
  }

  // Submappen parallel ophalen — voorheen serieel (N+1 round-trips).
  // `allSettled` zodat één falende submap niet de hele lijst blokkeert.
  const subfolders = rootChildren.filter((c) => c.folder);
  const subResults = await Promise.allSettled(
    subfolders.map((sub) =>
      listChildren(`${folderPath}/${sub.name}`).then((children) => ({
        name: sub.name as string,
        children,
      })),
    ),
  );
  for (const result of subResults) {
    if (result.status === "fulfilled") {
      for (const child of result.value.children) {
        const mapped = mapItem(child, result.value.name);
        if (mapped) images.push(mapped);
      }
    } else {
      console.warn(
        `Graph subfolder listing mislukt, wordt overgeslagen:`,
        (result.reason as GraphLikeError)?.message,
      );
    }
  }

  images.sort((a, b) => (b.lastModified || "").localeCompare(a.lastModified || ""));
  return images;
}

export async function getItemById(
  driveId: string,
  itemId: string
): Promise<{ name: string; mimeType: string; size: number; webUrl: string } | null> {
  const client = await graphDocs();
  try {
    const item = await client.api(`/drives/${driveId}/items/${itemId}`).get();
    return {
      name: item.name,
      mimeType: item.file?.mimeType || "application/octet-stream",
      size: item.size || 0,
      webUrl: item.webUrl || "",
    };
  } catch (err: any) {
    if (err.statusCode === 404) return null;
    throw err;
  }
}
