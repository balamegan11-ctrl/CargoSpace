import { Component } from 'react'

// Without a boundary, any component that throws blanks the whole screen — the
// single hardest failure mode to debug. This shows what actually broke instead.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('CargoSpace crashed:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center p-6">
        <div className="w-full max-w-2xl rounded-2xl border border-red-500/40 bg-red-500/5 p-6">
          <h1 className="text-xl font-bold text-red-300">Something broke while rendering this page</h1>
          <p className="mt-2 text-sm text-slate-300">
            A component threw an error, so React unmounted the whole tree. The message below is the real
            cause — this panel replaces the old blank white screen.
          </p>
          <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-red-200 whitespace-pre-wrap">
            {String(this.state.error?.stack || this.state.error)}
          </pre>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-200"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
