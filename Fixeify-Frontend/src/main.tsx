import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { ThemeProvider } from "./context/ThemeContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./index.css";

const app = (
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <Provider store={store}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Provider>
  </GoogleOAuthProvider>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  import.meta.env.DEV ? (
    app
  ) : (
    <React.StrictMode>{app}</React.StrictMode>
  )
);