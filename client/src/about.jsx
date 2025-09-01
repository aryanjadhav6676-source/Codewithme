import React from "react";

const About = () => (
  <div style={{
    minHeight: "100vh",
    background: "#1e1e1e",
    color: "#d4d4d4",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Fira Mono', 'Segoe UI', monospace"
  }}>
    <h1 style={{ fontSize: "2.5em", marginBottom: "0.5em" }}>Project Core Idea</h1>
    <p style={{ maxWidth: "600px", fontSize: "1.2em", marginBottom: "2em" }}>
      <strong>Live Code Editor:</strong> Collaborate in real-time, chat, run code in multiple languages, and share sessions. 
      Experience VS Code-like editing in your browser with live output and multi-file support.
    </p>
    <a
      href="/editor/room1"
      style={{
        background: "#007acc",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        padding: "16px 32px",
        fontSize: "1.2em",
        fontWeight: "bold",
        cursor: "pointer",
        textDecoration: "none"
      }}
    >
      Click here for Demo
    </a>
  </div>
);

export default About;