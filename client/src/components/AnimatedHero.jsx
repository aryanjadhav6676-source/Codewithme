import React from "react";
import { useNavigate } from "react-router-dom";
import AnimatedBot from "./AnimatedBot";

const heroStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "80vh",
  position: "relative",
  color: "#fff",
  textAlign: "center",
};

const glowBtn = {
  background: "linear-gradient(90deg, #7f53ac 0%, #56b6c2 100%)",
  color: "#fff",
  border: "none",
  borderRadius: "32px",
  padding: "18px 48px",
  fontSize: "1.3em",
  fontWeight: "bold",
  margin: "18px",
  boxShadow: "0 0 24px #56b6c2aa",
  cursor: "pointer",
  transition: "transform 0.2s, box-shadow 0.2s",
};

const AnimatedHero = () => {
  const navigate = useNavigate();

  return (
    <section style={heroStyle}>
      <div style={{ fontSize: "3em", fontWeight: "bold", marginBottom: "0.3em", letterSpacing: "2px" }}>
        Code Together. <span style={{ color: "#56b6c2" }}>Think Smarter.</span> Build Faster.
      </div>
      <div style={{ fontSize: "1.3em", marginBottom: "1.5em", opacity: 0.85 }}>
        Real-time collaborative coding + <span style={{ color: "#7f53ac" }}>AI teammate</span> for every project.
      </div>
      <div>
        <button style={glowBtn} onClick={() => navigate("/create-join")}>Get Demo</button>
        <button style={{ ...glowBtn, background: "#252526", boxShadow: "0 0 16px #7f53ac88" }} onClick={() => navigate("/features")}>Explore Features</button>
      </div>
      <AnimatedBot />
    </section>
  );
};

export default AnimatedHero;