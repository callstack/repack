let hostname = __PUBLIC_HOST__;

if (__PLATFORM__ === 'android' && __PUBLIC_HOST__ === 'localhost') {
  hostname = '10.0.2.2';
}

const location = {
  host: `${hostname}:${__PUBLIC_PORT__}`,
  hostname,
  href: `${__PUBLIC_PROTOCOL__}://${hostname}:${__PUBLIC_PORT__}/`,
  origin: `${__PUBLIC_PROTOCOL__}://${hostname}:${__PUBLIC_PORT__}`,
  pathname: '/',
  port: __PUBLIC_PORT__,
  protocol: __PUBLIC_PROTOCOL__,
};

type DevServerLocation = typeof location;

export function getDevServerLocation(): DevServerLocation {
  return location;
}
