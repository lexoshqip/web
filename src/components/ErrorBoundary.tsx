import { Component, type ReactNode } from "react";

/**
 * Catches render-time crashes anywhere below it and shows a friendly
 * recovery panel instead of a blank page.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-bold">Diçka shkoi gabim</h1>
          <p className="mt-2 break-all text-sm text-muted">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-6 rounded-xl bg-brand px-5 py-2.5 font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Provo përsëri
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
