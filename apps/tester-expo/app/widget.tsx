import { loadRemote } from '@module-federation/enhanced/runtime';
import { type ErrorBoundaryProps, Link } from 'expo-router';
import {
  Component,
  type ComponentType,
  type ReactNode,
  useEffect,
  useState,
} from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

type ExpoWidgetComponent = ComponentType<{ recoveryAttempt?: number }>;

type ExpoWidgetLoadState =
  | { status: 'loading' }
  | { component: ExpoWidgetComponent; status: 'loaded' }
  | { error: Error; status: 'failed' };

interface WidgetRecoveryBoundaryProps {
  children: (attempt: number) => ReactNode;
}

interface WidgetRecoveryBoundaryState {
  attempt: number;
  error: Error | null;
}

class WidgetRecoveryBoundary extends Component<
  WidgetRecoveryBoundaryProps,
  WidgetRecoveryBoundaryState
> {
  state: WidgetRecoveryBoundaryState = {
    attempt: 0,
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  retry = () => {
    this.setState(({ attempt }) => ({
      attempt: attempt + 1,
      error: null,
    }));
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.recovery} testID="expo-widget-error">
          <Text>Unable to load the Expo widget.</Text>
          <Text selectable testID="expo-widget-error-message">
            {this.state.error.message}
          </Text>
          <Button
            testID="expo-widget-retry"
            title="Retry Expo widget"
            onPress={this.retry}
          />
        </View>
      );
    }

    return this.props.children(this.state.attempt);
  }
}

function ExpoWidgetAttempt({ attempt }: { attempt: number }) {
  const [loadState, setLoadState] = useState<ExpoWidgetLoadState>({
    status: 'loading',
  });

  useEffect(() => {
    let active = true;
    loadRemote<{ default: ExpoWidgetComponent }>('ExpoWidget/Widget').then(
      (loadedModule) => {
        if (!loadedModule) {
          if (active) {
            setLoadState({
              error: new Error('ExpoWidget/Widget returned no module'),
              status: 'failed',
            });
          }
          return;
        }
        const { default: component } = loadedModule;
        if (active) setLoadState({ component, status: 'loaded' });
      },
      (error: Error) => {
        if (active) setLoadState({ error, status: 'failed' });
      }
    );
    return () => {
      active = false;
    };
  }, []);

  if (loadState.status === 'failed') throw loadState.error;
  if (loadState.status === 'loading') {
    return <Text testID="expo-widget-loading">Loading widget…</Text>;
  }

  const ExpoWidget = loadState.component;

  return <ExpoWidget recoveryAttempt={attempt} />;
}

export function ErrorBoundary({ error }: ErrorBoundaryProps) {
  return (
    <View style={styles.container} testID="expo-widget-error">
      <Text>Unable to load the Expo widget.</Text>
      <Text selectable testID="expo-widget-error-message">
        {error.message}
      </Text>
      <Link href="/">Back home</Link>
    </View>
  );
}

export default function WidgetRoute() {
  return (
    <View style={styles.container}>
      <Text testID="expo-widget-route-ready">Expo federated widget route</Text>
      <Text testID="expo-host-public-environment">
        Host public environment:{' '}
        {process.env.EXPO_PUBLIC_FEDERATION_OWNER ?? 'missing'}
      </Text>
      <WidgetRecoveryBoundary>
        {(attempt) => <ExpoWidgetAttempt attempt={attempt} key={attempt} />}
      </WidgetRecoveryBoundary>
      <Link href="/">Back home</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
  recovery: {
    alignItems: 'center',
    gap: 16,
  },
});
