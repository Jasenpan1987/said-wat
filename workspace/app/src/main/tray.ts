import { Menu, Tray, app, nativeImage } from "electron";

/**
 * Creates the menu-bar tray. The app lives here and nowhere else until a
 * sticky-note popup is summoned (T-007).
 *
 * The returned Tray must be kept referenced for its lifetime — the module
 * singleton in index.ts does that.
 */
export function createTray(iconPath: string): Tray {
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);

  const tray = new Tray(icon);
  tray.setToolTip("said-wat");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      // Placeholder until T-011 wires the settings window.
      { label: "Settings", enabled: false },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ])
  );
  return tray;
}
