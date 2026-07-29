const NETWORK_LOAD_RESOURCE_ERROR = {
  success: false,
  netErrorName: 'net::ERR_FAILED',
  netError: -2,
  httpStatusCode: 500,
} as const;

type Connection = { debugger: { sendMessage: (message: any) => void } };

async function sendNetworkLoadResourceResponse(
  connection: Connection,
  id: number,
  url: string
) {
  // DevTools expects the loaded resource body to be returned as Base64-encoded
  // bytes in the CDP response payload.
  const response = await fetch(url).catch(() => null);
  const resource = !response
    ? NETWORK_LOAD_RESOURCE_ERROR
    : {
        success: true,
        httpStatusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        content: Buffer.from(await response.text()).toString('base64'),
        base64Encoded: true,
      };

  connection.debugger.sendMessage({ id, result: { resource } });
}

// RN dev-middleware already handles same-origin requests. We only intercept
// cross-origin requests here so the original debugger behavior stays intact for
// the local server while MF-style remote resources can still be fetched.
//
// The custom inspector hook must synchronously return `true` when it takes
// ownership of a message, so we start the async fetch and report handling now.
export function handleCustomNetworkLoadResource(
  connection: Connection,
  message: unknown,
  serverBaseUrl: string
) {
  if (typeof message !== 'object' || message === null) {
    return false;
  }

  const request = message as {
    id?: unknown;
    method?: unknown;
    params?: { url?: unknown };
  };

  if (
    request.method !== 'Network.loadNetworkResource' ||
    typeof request.id !== 'number' ||
    typeof request.params?.url !== 'string' ||
    !URL.canParse(request.params.url) ||
    !URL.canParse(serverBaseUrl)
  ) {
    return false;
  }

  if (new URL(request.params.url).origin === new URL(serverBaseUrl).origin) {
    return false;
  }

  void sendNetworkLoadResourceResponse(
    connection,
    request.id,
    request.params.url
  ).catch(() =>
    console.error(
      '[DevServer] Failed to send Network.loadNetworkResource response'
    )
  );

  return true;
}
