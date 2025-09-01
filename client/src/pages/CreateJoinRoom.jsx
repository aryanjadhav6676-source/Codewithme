import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const CreateJoinRoom = () => {
  const [roomId, setRoomId] = useState("");
  const [createdRoomId, setCreatedRoomId] = useState("");
  const navigate = useNavigate();

  const handleCreate = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8);
    setCreatedRoomId(newRoomId);
    setRoomId(newRoomId);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/editor/${roomId}`);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #2b1055 0%, #7597de 100%)" }}>
      <Navbar />
      <div style={{ paddingTop: "80px", textAlign: "center" }}>
        <h1 style={{ color: "#56b6c2", fontSize: "2.2em", marginBottom: "1em" }}>Create or Join a Room</h1>
        <button
          onClick={handleCreate}
          style={{
            background: "linear-gradient(90deg, #7f53ac 0%, #56b6c2 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "16px",
            padding: "16px 40px",
            fontWeight: "bold",
            fontSize: "1.2em",
            marginBottom: "2em",
            cursor: "pointer",
            boxShadow: "0 0 16px #56b6c2"
          }}
        >
          Create New Room
        </button>
        {createdRoomId && (
          <div style={{ margin: "1em 0", color: "#fff", fontWeight: "bold" }}>
            Room ID: <span style={{ color: "#56b6c2" }}>{createdRoomId}</span>
            <button
              style={{
                marginLeft: "12px",
                background: "#56b6c2",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "4px 12px",
                cursor: "pointer"
              }}
              onClick={() => {
                navigator.clipboard.writeText(createdRoomId);
              }}
            >
              Copy
            </button>
            <button
              style={{
                marginLeft: "12px",
                background: "#7f53ac",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "4px 12px",
                cursor: "pointer"
              }}
              onClick={() => navigate(`/editor/${createdRoomId}`)}
            >
              Enter Room
            </button>
          </div>
        )}
        <form onSubmit={handleJoin} style={{ marginTop: "2em" }}>
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              fontSize: "1.1em",
              marginRight: "12px",
              background: "#252526",
              color: "#fff"
            }}
          />
          <button
            type="submit"
            style={{
              background: "#56b6c2",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "12px 28px",
              fontWeight: "bold",
              fontSize: "1.1em",
              cursor: "pointer",
              boxShadow: "0 0 8px #56b6c2"
            }}
          >
            Join Room
          </button>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default CreateJoinRoom;