import { useEffect, useState } from "react";
import { request, setCsrfToken, isDemo } from "../services/api.js";
import { Scale } from "./Icons.jsx";

export default function SessionGate({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!isDemo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isDemo) return;

    let cancelled = false;

    const expired = () => {
      setCsrfToken("");
      setUser(null);
      setPassword("");
      setError("Sua sessão expirou. Entre novamente.");
    };

    window.addEventListener(
      "gieci:session-expired",
      expired
    );

    request("/auth/session")
      .then((result) => {
        if (!cancelled) {
          setCsrfToken(result.csrfToken);
          setUser(result.user);
        }
      })
      .catch((err) => {
        if (
          !cancelled &&
          err.status !== 401
        ) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;

      window.removeEventListener(
        "gieci:session-expired",
        expired
      );
    };
  }, []);

  async function login(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const result = await request(
        "/auth/login",
        {
          method: "POST",

          body: {
            email: email.trim(),
            password,
          },
        }
      );

      setCsrfToken(result.csrfToken);
      setUser(result.user);
      setPassword("");

    } catch (err) {
      setError(
        err.message ||
        "Não foi possível entrar."
      );

    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (busy) return;

    setBusy(true);

    try {
      await request(
        "/auth/logout",
        {
          method: "POST",
          body: {},
        }
      );

      setCsrfToken("");
      setUser(null);

    } catch (err) {
      window.alert(err.message);

    } finally {
      setBusy(false);
    }
  }

  if (isDemo || user) {
    return children({
      user,
      onLogout: logout,
    });
  }

  return (
    <main className="gieci-app g-login-screen">

      <section className="g-form g-login-card">

        <div className="g-brand">

          <div className="g-brand-icon">
            <Scale size={22} />
          </div>

          <div>

            <h1 className="g-brand-title">
              GIECI
            </h1>

            <p className="g-brand-sub">
              Gestão Inteligente de Estoque para Cozinhas Industriais
            </p>

          </div>

        </div>

        {loading ? (

          <p role="status">
            Verificando sessão...
          </p>

        ) : (

          <form onSubmit={login}>

            <h2 className="g-login-title">
              Entrar no estoque
            </h2>

            <div className="g-field">

              <label htmlFor="email">
                E-mail
              </label>

              <input
                className="g-input g-sans"
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
                maxLength={254}
              />

            </div>

            <div className="g-field">

              <label htmlFor="password">
                Senha
              </label>

              <input
                className="g-input g-sans"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                maxLength={128}
              />

            </div>

            {error && (

              <p
                className="g-login-error"
                role="alert"
              >
                {error}
              </p>

            )}

            <button
              className="g-btn g-btn-primary g-btn-block"
              type="submit"
              disabled={busy}
            >
              {busy
                ? "Entrando..."
                : "Entrar"}
            </button>

            <div
              style={{
                marginTop: "18px",
                textAlign: "center",
              }}
            >

              <p
                style={{
                  margin: "0 0 10px",
                  color: "#5b6b60",
                  fontSize: "13px",
                }}
              >
                Ainda não possui uma conta?
              </p>

              <a
                href="/Signup.html"
                style={{
                  width: "100%",
                  minHeight: "40px",

                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",

                  boxSizing: "border-box",

                  padding: "10px 14px",

                  backgroundColor: "#ffffff",

                  color: "#2e6f4b",

                  border: "1px solid #2e6f4b",
                  borderRadius: "8px",

                  fontFamily: "inherit",
                  fontSize: "13px",
                  fontWeight: "600",

                  textDecoration: "none",

                  cursor: "pointer",

                  transition:
                    "background-color 0.2s ease, color 0.2s ease",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor =
                    "#edf6f0";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor =
                    "#ffffff";
                }}
              >
                Criar conta
              </a>

            </div>

          </form>

        )}

      </section>

    </main>
  );
}