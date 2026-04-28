/** The subdomain that identifies the admin app */
export const APP_SUBDOMAIN = process.env.NEXT_PUBLIC_APP_SUBDOMAIN || 'app';

export interface ParsedHostname {
  hostname: string;
  portSuffix: string;
  rootHost: string;
  subdomain?: string;
  isLocalhostLike: boolean;
}

type Protocol = 'http:' | 'https:';

function splitHostAndPort(hostnameWithPort: string): { hostname: string; portSuffix: string } {
  const normalized = hostnameWithPort.toLowerCase();
  const colonIndex = normalized.lastIndexOf(':');

  if (colonIndex > -1) {
    return {
      hostname: normalized.slice(0, colonIndex),
      portSuffix: normalized.slice(colonIndex),
    };
  }

  return {
    hostname: normalized,
    portSuffix: '',
  };
}

function normalizeProtocol(protocol: string, fallback: Protocol): Protocol {
  const primary = protocol.split(',')[0]?.trim().toLowerCase().replace(/:$/, '');

  if (primary === 'http' || primary === 'https') {
    return `${primary}:` as Protocol;
  }

  return fallback;
}

/**
 * Parses a host header or window.location.host into the canonical root host and subdomain.
 * This keeps local development (`localhost` / `app.localhost`) separate from production
 * (`bananaaquapark.com` / `app.bananaaquapark.com`).
 */
export function parseHostname(hostnameWithPort: string): ParsedHostname {
  const { hostname, portSuffix } = splitHostAndPort(hostnameWithPort);

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return {
      hostname,
      portSuffix,
      rootHost: 'localhost',
      isLocalhostLike: true,
    };
  }

  if (hostname.endsWith('.localhost')) {
    const [subdomain] = hostname.split('.');
    return {
      hostname,
      portSuffix,
      subdomain,
      rootHost: 'localhost',
      isLocalhostLike: true,
    };
  }

  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return {
      hostname,
      portSuffix,
      subdomain: parts[0],
      rootHost: parts.slice(1).join('.'),
      isLocalhostLike: false,
    };
  }

  return {
    hostname,
    portSuffix,
    rootHost: hostname,
    isLocalhostLike: false,
  };
}

/** Extracts the subdomain from the current hostname. Client-side only. */
export function getSubdomain(): string | undefined {
  return parseHostname(window.location.host).subdomain;
}

/** Returns true when the current hostname is the admin subdomain. Client-side only. */
export function isAdminSubdomain(): boolean {
  return getSubdomain() === APP_SUBDOMAIN;
}

/** Builds the canonical public/root origin for the current host. */
export function buildRootUrlFromHostname(hostnameWithPort: string, protocol: string): string {
  const { rootHost, portSuffix, isLocalhostLike } = parseHostname(hostnameWithPort);
  const safeProtocol = normalizeProtocol(protocol, isLocalhostLike ? 'http:' : 'https:');
  return `${safeProtocol}//${rootHost}${portSuffix}`;
}

/** Builds the canonical admin origin for the current host. */
export function buildAdminUrlFromHostname(hostnameWithPort: string, protocol: string): string {
  const { rootHost, portSuffix, isLocalhostLike } = parseHostname(hostnameWithPort);
  const safeProtocol = normalizeProtocol(protocol, isLocalhostLike ? 'http:' : 'https:');

  if (isLocalhostLike) {
    return `${safeProtocol}//${APP_SUBDOMAIN}.localhost${portSuffix}`;
  }

  return `${safeProtocol}//${APP_SUBDOMAIN}.${rootHost}${portSuffix}`;
}

/** Builds the full admin app URL from the current environment. Client-side only. */
export function getAdminUrl(): string {
  if (typeof window === 'undefined') return 'https://app.bananaaquapark.com';
  return buildAdminUrlFromHostname(window.location.host, window.location.protocol);
}
