import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const navStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "24px 48px",
  background: "rgba(34, 34, 54, 0.7)",
  backdropFilter: "blur(8px)",
  position: "sticky",
  top: 0,
  zIndex: 100,
};

const linkStyle = {
  color: "#fff",
  fontWeight: "bold",
  fontSize: "1.1em",
  margin: "0 18px",
  textDecoration: "none",
  transition: "color 0.2s",
};

const activeLinkStyle = {
  ...linkStyle,
  color: "#56b6c2",
  textShadow: "0 0 8px #56b6c2",
};

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  return (
    <nav style={navStyle}>
      <div style={{ fontSize: "1.5em", fontWeight: "bold", color: "#7f53ac" }}>
        <span style={{ color: "#56b6c2" }}>AI</span>Collab
      </div>
      <div>
        <Link to="/" style={location.pathname === "/" ? activeLinkStyle : linkStyle}>Home</Link>
        <Link to="/features" style={location.pathname === "/features" ? activeLinkStyle : linkStyle}>Features</Link>
        <Link to="/pricing" style={location.pathname === "/pricing" ? activeLinkStyle : linkStyle}>Pricing</Link>
        <Link to="/about" style={location.pathname === "/about" ? activeLinkStyle : linkStyle}>About</Link>
        <Link to="/contact" style={location.pathname === "/contact" ? activeLinkStyle : linkStyle}>Contact</Link>
        <Link to="/blog" style={location.pathname === "/blog" ? activeLinkStyle : linkStyle}>Blog</Link>
        {user ? (
          <>
            <span style={{ marginLeft: "18px", marginRight: "10px" }}>Hello, {user.name || "User"}</span>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login"><button style={{ marginLeft: "18px", marginRight: "10px" }}>Login</button></Link>
            <Link to="/signup"><button>Signup</button></Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;