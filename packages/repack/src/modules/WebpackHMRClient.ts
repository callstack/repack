import type { HMRMessage } from '../types.js';
import { getDevServerLocation } from './getDevServerLocation.js';

interface LoadingViewModule {
  hide(): void;
  showMessage(text: string, type: string): void;
}

class HMRClient {
  url: string;
  socket: WebSocket;
  // state
  lastCompilationHash: string | null = null;

  constructor(
    private app: {
      reload: () => void;
      dismissErrors: () => void;
      showLoadingView: (text: string, type: 'load' | 'refresh') => void;
      hideLoadingView: () => void;
    }
  ) {
    this.url = `ws://${getDevServerLocation().host}/__hmr`;
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

  processMessage(message: HMRMessage) {
    // Only process messages for the target platform
    if (message.body.name !== __PLATFORM__) {
      return;
    }

    switch (message.action) {
      case 'compiling':
        this.handleCompilationInProgress();
        break;
      case 'hash':
        this.handleHashUpdate(message.body.hash);
        break;
      case 'ok':
        this.handleBundleUpdate(message.body.hasErrors);
        break;
    }
  }

  handleCompilationInProgress() {
    console.debug('[HMRClient] Processing progress update');
    this.app.showLoadingView('Compiling...', 'refresh');
  }

  handleHashUpdate(hash?: string) {
    console.debug('[HMRClient] Processing hash update');
    this.lastCompilationHash = hash ?? null;
  }

  handleBundleUpdate(hasErrors?: boolean) {
    console.debug('[HMRClient] Processing bundle update');
    // only dismiss errors when there are no compilation errors
    if (hasErrors) {
      this.app.dismissErrors();
    }

    this.tryApplyUpdates();
    this.app.hideLoadingView();
  }

  isUpdateAvailable() {
    return this.lastCompilationHash !== __webpack_hash__;
  }

  // Attempt to update code on the fly, fall back to a hard reload.
  tryApplyUpdates() {
    // detect is there a newer version of this code available
    if (!this.isUpdateAvailable()) {
      return;
    }

    if (!module.hot) {
      // HMR is not enabled
      this.app.reload();
      return;
    }

    if (module.hot.status() !== 'idle') {
      // HMR is disallowed in other states than 'idle'
      return;
    }

    const handleApplyUpdates = (
      err: unknown,
      updatedModules: (string | number)[] | null
    ) => {
      const forcedReload = err || !updatedModules;
      if (forcedReload) {
        console.warn('[HMRClient] Forced reload');
        if (err) {
          console.debug('[HMRClient] Forced reload caused by: ', err);
        }
        this.app.reload();
        return;
      }

      if (this.isUpdateAvailable()) {
        // While we were updating, there was a new update! Do it again.
        this.tryApplyUpdates();
      }
    };

    console.debug('[HMRClient] Checking for updates on the server...');
    module.hot.check(true).then(
      (outdatedModules) => handleApplyUpdates(null, outdatedModules),
      (err) => handleApplyUpdates(err, null)
    );
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
    let LoadingView: LoadingViewModule;
    if (__REACT_NATIVE_MINOR_VERSION__ >= 75) {
      LoadingView = require('react-native/Libraries/Utilities/DevLoadingView');
    } else {
      LoadingView = require('react-native/Libraries/Utilities/LoadingView');
    }

    LoadingView.showMessage(text, type);
  };

  const hideLoadingView = () => {
    let LoadingView: LoadingViewModule;
    if (__REACT_NATIVE_MINOR_VERSION__ >= 75) {
      LoadingView = require('react-native/Libraries/Utilities/DevLoadingView');
    } else {
      LoadingView = require('react-native/Libraries/Utilities/LoadingView');
    }

    LoadingView.hide();
  };

  new HMRClient({
    reload,
    dismissErrors,
    showLoadingView,
    hideLoadingView,
  });
}
