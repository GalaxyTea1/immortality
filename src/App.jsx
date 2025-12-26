import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GameProvider } from "./context/GameContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Cultivation from "./pages/Cultivation";
import World from "./pages/World";
import Inventory from "./pages/Inventory";
import Shop from "./pages/Shop";
import Leaderboard from "./pages/Leaderboard";
import "./index.css";

function App() {
  return (
    <GameProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="cultivation" element={<Cultivation />} />
            <Route path="world" element={<World />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="shop" element={<Shop />} />
            <Route path="leaderboard" element={<Leaderboard />} />
          </Route>
        </Routes>
      </Router>
    </GameProvider>
  );
}

export default App;
