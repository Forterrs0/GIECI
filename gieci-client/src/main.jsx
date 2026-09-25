import { createRoot } from "react-dom/client";

import App from "./App.jsx";

import SessionGate from "./components/SessionGate.jsx";

import ErrorBoundary from "./components/ErrorBoundary.jsx";


import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "@fontsource/space-grotesk/latin-700.css";

import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";

import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-700.css";


import "./styles/original.css";

import "./styles/extracted.css";

import "./styles/responsive.css";

/*
  IMPORTANTE:
  deixe shelves.css por último,
  porque ele organiza os cards sem
  destruir o restante do visual.
*/
import "./styles/shelves.css";


createRoot(
  document.getElementById("root")
).render(

  <ErrorBoundary>

    <SessionGate>
      {(props) => (
        <App {...props} />
      )}
    </SessionGate>

  </ErrorBoundary>

);
