import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  useEffect(() => {
    window.location.replace("/jansetu/index.html");
  }, []);
  return (
    <div style={{
      display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center",
      background: "#0b0a14", color: "#f6efe1", fontFamily: "Georgia, serif", textAlign: "center", padding: 24,
    }}>
      <div>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>JanSetu · Loading…</h1>
        <p style={{ opacity: 0.7 }}>
          Opening the Civic Issue Reporting System. If it doesn't redirect,{" "}
          <a href="/jansetu/index.html" style={{ color: "#ffd28a" }}>click here</a>.
        </p>
      </div>
    </div>
  );
}
