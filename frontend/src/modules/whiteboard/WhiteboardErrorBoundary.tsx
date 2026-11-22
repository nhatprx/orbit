import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface WhiteboardErrorBoundaryProps {
  onBack?: () => void;
  children: ReactNode;
}

interface WhiteboardErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class WhiteboardErrorBoundary extends Component<
  WhiteboardErrorBoundaryProps,
  WhiteboardErrorBoundaryState
> {
  state: WhiteboardErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): WhiteboardErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'The whiteboard canvas encountered an unexpected error.',
    };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Error state is rendered directly to the user in the fallback UI.
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#0D1117] p-6 text-center">
          <div className="flex max-w-md flex-col items-center gap-3 border border-[#EF4444] bg-[#161B22] p-6">
            <AlertTriangle className="h-6 w-6 text-[#EF4444]" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-[#E6EDF3]">Whiteboard Canvas Failed to Load</h3>
            <p className="text-xs text-[#BDBDBD]">{this.state.message}</p>
            <div className="flex items-center gap-2 pt-1">
              <Button type="button" variant="primary" onClick={this.handleReset}>
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                Retry Canvas
              </Button>
              {this.props.onBack && (
                <Button type="button" variant="secondary" onClick={this.props.onBack}>
                  Back to Boards
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
