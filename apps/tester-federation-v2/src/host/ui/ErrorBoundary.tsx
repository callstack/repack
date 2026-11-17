import * as React from 'react';

import Report from './Report';

type ErrorBoundaryProps = React.PropsWithChildren<{ testID: string }>;
type ErrorBoundaryState = { error: Error | null };

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <Report testID={this.props.testID} name="error" value={error.message} />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
