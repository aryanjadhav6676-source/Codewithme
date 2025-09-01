import React from "react";

const Footer = () => (
  <footer style={{
    background: "rgba(34,34,54,0.7)",
    color: "#fff",
    textAlign: "center",
    padding: "24px 0",
    fontSize: "1em",
    marginTop: "2em"
  }}>
    &copy; {new Date().getFullYear()} AI Collab | Connect: <a href="mailto:your@email.com" style={{ color: "#56b6c2" }}>Email</a> | <a href="https://github.com/" style={{ color: "#56b6c2" }}>GitHub</a>
  </footer>
);

export default Footer;