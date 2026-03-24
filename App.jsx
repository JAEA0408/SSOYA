import { Routes, Route } from "react-router-dom";
import SSOYA from "./SSOYA";
import Admin from "./Admin";

function App() {
  return (
    <Routes>
      <Route path="/" element={<SSOYA />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}

export default App;
