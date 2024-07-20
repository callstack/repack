/* eslint-env browser */
/* globals __webpack_hash__, __DEV__, __PLATFORM__, __PUBLIC_PORT__ */

import type { HMRMessage, HMRMessageBody } from '../types';
import { getDevServerLocation } from './getDevServerLocation';

class HMRClient {
  url: string;
  socket: WebSocket;
  lastHash = '';

  constructor(
    private app: {
      reload: () => void;
      dismissErrors: () => void;
      showLoadingView: (text: string, type: 'load' | 'refresh') => void;
      hideLoadingView: () => void;
    }
  ) {
    this.url = `ws://${
      getDevServerLocation().hostname
    }:${__PUBLIC_PORT__}/__hmr?platform=${__PLATFORM__}`;
    this.socket = new WebSocket(this.url);

    console.debug('[HMRClient] Connecting...', {
      url: this.url,
    });

    this.socket.onopen = () => {
      console.debug('[HMRClient] Connected');
    };

    this.socket.onclose = () => {
      console.debug('[HMRClient] Disconnected');
    };

    this.socket.onerror = (event) => {
      console.debug('[HMRClient] Error', event);
    };

    this.socket.onmessage = (event) => {
      try {
        this.processMessage(JSON.parse(event.data.toString()));
      } catch (error) {
        console.warn('[HMRClient] Invalid HMR message', { event, error });
      }
    };
  }

  upToDate(hash?: string) {
    if (hash) {
      this.lastHash = hash;
    }
    return this.lastHash === __webpack_hash__;
  }

  processMessage(message: HMRMessage) {
    switch (message.action) {
      case 'building':
        this.app.showLoadingView('Rebuilding...', 'refresh');
        console.debug('[HMRClient] Bundle rebuilding', {
          name: message.body?.name,
        });
        break;
      case 'built':
        console.debug('[HMRClient] Bundle rebuilt', {
          name: message.body?.name,
          time: message.body?.time,
        });
      // Fall through
      case 'sync':
        if (!message.body) {
          console.warn('[HMRClient] HMR message body is empty');
          return;
        }

        if (message.body.errors?.length) {
          message.body.errors.forEach((error) => {
            console.error('Cannot apply update due to error:', error);
          });
          this.app.hideLoadingView();
          return;
        }

        if (message.body.warnings?.length) {
          message.body.warnings.forEach((warning) => {
            console.warn('[HMRClient] Bundle contains warnings:', warning);
          });
        }

        this.applyUpdate(message.body);
    }
  }

  applyUpdate(update: HMRMessageBody) {
    if (!module.hot) {
      throw new Error('[HMRClient] Hot Module Replacement is disabled.');
    }

    if (!this.upToDate(update.hash) && module.hot.status() === 'idle') {
      console.debug('[HMRClient] Checking for updates on the server...');
      void this.checkUpdates(update);
    }
  }

  async checkUpdates(update: HMRMessageBody) {
    try {
      this.app.showLoadingView('Refreshing...', 'refresh');
      const updatedModules = await module.hot?.check(false);
      if (!updatedModules) {
        console.warn('[HMRClient] Cannot find update - full reload needed');
        this.app.reload();
        return;
      }

      const renewedModules = await module.hot?.apply({
        ignoreDeclined: true,
        ignoreUnaccepted: false,
        ignoreErrored: false,
        onDeclined: (data) => {
          // This module declined update, no need to do anything
          console.warn('[HMRClient] Ignored an update due to declined module', {
            chain: data.chain,
          });
        },
      });

      if (!this.upToDate()) {
        void this.checkUpdates(update);
        return;
      }

      // No modules updated - leave everything as it is (including errors)
      if (!renewedModules || renewedModules.length === 0) {
        console.debug('[HMRClient] No renewed modules - app is up to date');
        return;
      }

      // Double check to make sure all updated modules were accepted (renewed)
      const unacceptedModules = updatedModules.filter((moduleId) => {
        return renewedModules.indexOf(moduleId) < 0;
      });

      if (unacceptedModules.length) {
        console.warn(
          '[HMRClient] Not every module was accepted - full reload needed',
          { unacceptedModules }
        );
        this.app.reload();
      } else {
        console.debug('[HMRClient] Renewed modules - app is up to date', {
          renewedModules,
        });
        this.app.dismissErrors();
      }
    } catch (error) {
      if (module.hot?.status() === 'fail' || module.hot?.status() === 'abort') {
        console.warn(
          '[HMRClient] Cannot check for update - full reload needed'
        );
        console.warn('[HMRClient]', error);
        this.app.reload();
      } else {
        console.warn('[HMRClient] Update check failed', { error });
      }
    } finally {
      this.app.hideLoadingView();
    }
  }
}

if (__DEV__ && module.hot) {
  const reload = () => {
    const DevSettings = require('react-native/Libraries/Utilities/DevSettings');
    DevSettings.reload();
  };

  const dismissErrors = () => {
    const Platform = require('react-native/Libraries/Utilities/Platform');
    if (Platform.OS === 'ios') {
      const NativeRedBox =
        require('react-native/Libraries/NativeModules/specs/NativeRedBox').default;
      NativeRedBox?.dismiss?.();
    } else {
      const NativeExceptionsManager =
        require('react-native/Libraries/Core/NativeExceptionsManager').default;
      NativeExceptionsManager?.dismissRedbox();
    }
    const LogBoxData = require('react-native/Libraries/LogBox/Data/LogBoxData');
    LogBoxData.clear();
  };

  const showLoadingView = (text: string, type: 'load' | 'refresh') => {
    const LoadingView = require('react-native/Libraries/Utilities/LoadingView');
    LoadingView.showMessage(text, type);
  };

  const hideLoadingView = () => {
    const LoadingView = require('react-native/Libraries/Utilities/LoadingView');
    LoadingView.hide();
  };

  new HMRClient({
    reload,
    dismissErrors,
    showLoadingView,
    hideLoadingView,
  });
}
