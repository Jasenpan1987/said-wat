import { app, Menu, Tray, nativeImage } from "electron";
import path from "path";

const iconPath = path.join(
  import.meta.dirname,
  "../renderer/assets/tray-icon.png"
);

let tray: Tray | null = null;

app.whenReady().then(() => {
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip("said-wat");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      // Placeholder until T-011 wires the settings window.
      { label: "Settings", enabled: false },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ])
  );
});
