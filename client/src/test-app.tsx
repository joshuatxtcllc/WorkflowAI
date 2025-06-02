// Minimal test app to isolate import issues
import { useState } from "react";

export default function TestApp() {
  const [test] = useState("Hello World");
  
  return (
    <div style={{ padding: "20px", fontSize: "24px", color: "white", backgroundColor: "#000" }}>
      {test} - Basic React App Working
    </div>
  );
}