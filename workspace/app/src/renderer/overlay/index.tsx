import { createRoot } from "react-dom/client";
import { Overlay } from "./overlay";

const root = createRoot(document.getElementById("root")!);
root.render(<Overlay />);
