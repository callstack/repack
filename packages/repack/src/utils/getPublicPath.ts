/**
 * @deprecated Since Re.Pack v5.0.0.
 *
 * You can safely remove this function call -
 * the public path configuration is now automatically handled by Re.Pack with the same behavior.
 */
export function getPublicPath() {
  console.warn(
    '[NOTICE] `getPublicPath` is deprecated since Re.Pack v5.0.0.\n' +
      'You can safely remove this function call - the public path configuration is now automatically handled by Re.Pack with the same behavior.'
  );
  return 'DEPRECATED_GET_PUBLIC_PATH';
}
