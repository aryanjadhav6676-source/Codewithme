import React from "react";
import AnimatedHero from "../components/AnimatedHero";
import Footer from "../components/Footer";

const Home = () => (
  <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #2b1055 0%, #7597de 100%)" }}>
    <AnimatedHero />
    <Footer />
  </div>
);

export default Home;