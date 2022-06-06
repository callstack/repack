export interface HmrDelegate {
  getUriPath: () => string;
  onClientConnected: (platform: string, clientId: string) => void;
}
