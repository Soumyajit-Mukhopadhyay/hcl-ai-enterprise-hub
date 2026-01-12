import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("App crashed:", error);
    // eslint-disable-next-line no-console
    console.error("Component stack:", errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The app hit a runtime error. The details below help us fix the blank screen.
          </p>

          <div className="mt-4 rounded-md border border-border bg-muted p-4">
            <p className="text-sm font-medium">Error</p>
            <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-foreground">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            {this.state.errorInfo?.componentStack ? (
              <>
                <p className="mt-4 text-sm font-medium">Component stack</p>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
                  {this.state.errorInfo.componentStack}
                </pre>
              </>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={this.handleReload}>Reload</Button>
            <Button variant="outline" onClick={() => (window.location.href = "/auth")}>Go to Login</Button>
          </div>
        </div>
      </div>
    );
  }
}
