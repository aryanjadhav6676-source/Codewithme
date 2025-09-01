import React from "react";

const timeline = [
  { year: "2023", event: "Idea Born: Frustrated by slow teamwork, we imagined an AI-powered coding platform." },
  { year: "2024", event: "Prototype: Built first real-time editor with basic AI suggestions." },
  { year: "2025", event: "Launch: Added multi-format support, smart summaries, and team chat." },
  { year: "2026", event: "Today: Growing community, advanced AI teammate, and enterprise features." }
];

const TeamTimeline = () => (
  <div style={{ maxWidth: "600px", margin: "0 auto 2em auto" }}>
    {timeline.map((item, idx) => (
      <div key={idx} style={{
        display: "flex",
        alignItems: "center",
        marginBottom: "1.2em",
        opacity: 0.95,
        animation: `fadeIn 0.8s ${idx * 0.3}s both`
      }}>
        <div style={{
          background: "#56b6c2",
          color: "#fff",
          borderRadius: "50%",
          width: "48px",
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          fontSize: "1.2em",
          marginRight: "18px",
          boxShadow: "0 0 12px #56b6c2"
        }}>{item.year}</div>
        <div style={{ fontSize: "1.1em", color: "#fff" }}>{item.event}</div>
      </div>
    ))}
    <style>
      {`@keyframes fadeIn { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: translateY(0);} }`}
    </style>
  </div>
);

export default TeamTimeline;