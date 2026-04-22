import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Bug, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: "", showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    this.setState({ errorInfo: info.componentStack || "" });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: "", showDetails: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="error-boundary">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>

            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              An unexpected error occurred. You can try again or report this issue.
            </p>

            <div className="flex items-center justify-center gap-3 mb-6">
              <Button onClick={this.handleRetry} data-testid="button-retry">
                <RefreshCw className="w-4 h-4 mr-2" /> Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open("mailto:support@codecloud.dev?subject=Bug Report", "_blank")}
                data-testid="button-report-bug"
              >
                <Bug className="w-4 h-4 mr-2" /> Report Bug
              </Button>
            </div>

            <button
              onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-details"
            >
              {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {this.state.showDetails ? "Hide" : "Show"} error details
            </button>

            {this.state.showDetails && (
              <div className="mt-4 text-left bg-muted/30 border border-border/50 rounded-lg p-4 overflow-auto max-h-64" data-testid="error-details">
                <p className="text-xs font-mono text-destructive mb-2">{this.state.error?.message}</p>
                {this.state.error?.stack && (
                  <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-words">
                    {this.state.error.stack}
                  </pre>
                )}
                {this.state.errorInfo && (
                  <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-words mt-2 pt-2 border-t border-border/30">
                    {this.state.errorInfo}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
