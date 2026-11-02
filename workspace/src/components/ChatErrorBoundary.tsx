'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class ChatErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // This is deliberately limited to the exception and component stack.
    console.error('Workspace chat failed to render', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <section className="workspace-chat-panel" role="alert">
          <div className="notice error">
            <strong>Chat could not open.</strong> {this.state.error.message}
          </div>
          <button type="button" className="secondary compact" onClick={() => this.setState({ error: null })}>
            Try opening chat again
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
