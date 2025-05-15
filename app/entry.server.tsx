import { PassThrough } from 'node:stream';

import type { AppLoadContext, EntryContext } from '@remix-run/node';
import { createReadableStreamFromReadable } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import * as isbotModule from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';

const ABORT_DELAY = 5_000;

const BUILDER_APP_URL = process.env.VITE_API_BASE_URL;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  loadContext: AppLoadContext,
) {
  let prohibitOutOfOrderStreaming = isBotRequest(request.headers.get('user-agent')) || remixContext.isSpaMode;

  // Check for authentication except for specific paths
  const url = new URL(request.url);
  const authToken = url.searchParams.get('authToken');

  // Skip auth for assets and specific paths
  const isAssetPath = url.pathname.startsWith('/build/') || url.pathname.startsWith('/assets/');

  const isProdBuild = process.env.VITE_PROD === 'true';

  if (!isAssetPath && isProdBuild) {
    // First check if the site is public
    try {
      const { origin } = url;
      const publicCheckResponse = await fetch(
        `${BUILDER_APP_URL}/api/website-access?url=${encodeURIComponent(origin)}`,
      );
      const publicCheckResult = await publicCheckResponse.json<{ isPublic: boolean }>();

      // If the site is public, allow access without authentication
      if (publicCheckResult.isPublic) {
        return prohibitOutOfOrderStreaming
          ? handleBotRequest(request, responseStatusCode, responseHeaders, remixContext)
          : handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext);
      }
    } catch (error) {
      console.error('Error checking site public status:', error);
      // If we can't check the public status, continue with authentication
    }

    const sessionCookie = request.headers.get('Cookie')?.match(/userSession=([^;]+)/)?.[1];

    if (!sessionCookie && !authToken) {
      // No auth token or session, redirect to builder app auth endpoint
      const currentUrl = encodeURIComponent(request.url);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${BUILDER_APP_URL}/app-access?redirect=${currentUrl}`,
        },
      });
    }

    if (authToken) {
      // Extract app ID from URL
      const { origin } = url;

      try {
        // Validate token with the builder app
        const validationResponse = await fetch(`${BUILDER_APP_URL}/api/website-access`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: authToken, url: origin }),
        });

        const result = await validationResponse.json<{ allowed: boolean }>();

        if (!result.allowed) {
          // Token is invalid, return 403 Forbidden
          return new Response('Forbidden', {
            status: 403,
            headers: {
              'Content-Type': 'text/plain',
            },
          });
        }

        // Create a clean URL without the token
        url.searchParams.delete('authToken');

        if (url.toString() !== request.url) {
          // Set a session cookie with the token
          responseHeaders.append(
            'Set-Cookie',
            `userSession=${authToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24}`,
          );

          return new Response(null, {
            status: 302,
            headers: {
              Location: url.toString(),
              'Set-Cookie': `userSession=${authToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24}`,
            },
          });
        }
      } catch (error) {
        console.error('Token validation error:', error);
        // In case of network error, still allow the request to continue
        // if there's a session cookie
        if (!sessionCookie) {
          const currentUrl = encodeURIComponent(request.url);
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${BUILDER_APP_URL}/app-access?redirect=${currentUrl}`,
            },
          });
        }
      }
    }

    // If we have a session cookie, validate access
    if (sessionCookie) {
      try {
        const { origin } = url;
        const validationResponse = await fetch(`${BUILDER_APP_URL}/api/website-access`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: sessionCookie, url: origin }),
        });

        const result = await validationResponse.json<{ allowed: boolean }>();

        if (!result.allowed) {
          // Access is not allowed, return 403 Forbidden
          return new Response('Forbidden', {
            status: 403,
            headers: {
              'Content-Type': 'text/plain',
            },
          });
        }
      } catch (error) {
        console.error('Access validation error:', error);
        // In case of network error, redirect to auth
        const currentUrl = encodeURIComponent(request.url);
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${BUILDER_APP_URL}/app-access?redirect=${currentUrl}`,
          },
        });
      }
    }
  }

  return prohibitOutOfOrderStreaming
    ? handleBotRequest(request, responseStatusCode, responseHeaders, remixContext)
    : handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext);
}

// We have some Remix apps in the wild already running with isbot@3 so we need
// to maintain backwards compatibility even though we want new apps to use
// isbot@4.  That way, we can ship this as a minor Semver update to @remix-run/dev.
function isBotRequest(userAgent: string | null) {
  if (!userAgent) {
    return false;
  }

  // isbot >= 3.8.0, >4
  if ('isbot' in isbotModule && typeof isbotModule.isbot === 'function') {
    return isbotModule.isbot(userAgent);
  }

  return false;
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />,
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />,
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
