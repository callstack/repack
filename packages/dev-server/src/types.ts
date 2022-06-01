/**
 * Development server configuration options.
 */
export interface DevServerOptions {
  /**
   * Hostname or IP address under which to run the development server.
   * When left unspecified, it will listen on all available network interfaces, similarly to listening on '0.0.0.0'.
   */
  host?: string;

  /** Port under which to run the development server. See: {@link DEFAULT_PORT}. */
  port: number;

  /** HTTPS options.
   * If specified, the server will use HTTPS, otherwise HTTP.
   */
  https?: {
    /** Path to certificate when running server on HTTPS. */
    cert?: string;

    /** Path to certificate key when running server on HTTPS. */
    key?: string;
  };

  /** Whether to enable Hot Module Replacement. */
  hmr?: boolean;
}
