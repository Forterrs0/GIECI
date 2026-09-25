import { Component } from "react";
export default class ErrorBoundary extends Component {
  state = {
    failed: false,
  };
  static getDerivedStateFromError() {
    return {
      failed: true,
    };
  }
  componentDidCatch(error) {
    console.error("Falha de interface:", error.name);
  }
  render() {
    return this.state.failed ? (
      <main className="gieci-app">
        <div className="g-notice" role="alert">
          Não foi possível exibir esta tela. Seus dados salvos não foram
          apagados.{" "}
          <button className="g-btn" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </div>
      </main>
    ) : (
      this.props.children
    );
  }
}
