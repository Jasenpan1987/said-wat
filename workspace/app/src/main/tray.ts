import { Menu, Tray, app, nativeImage } from "electron";

/**
 * Creates the menu-bar tray. The app lives here and nowhere else until a
 * sticky-note popup is summoned (T-007).
 *
 * The returned Tray must be kept referenced for its lifetime — the module
 * singleton in index.ts does that.
 */
export function createTray(iconPath: string, onOpenSettings: () => void): Tray {
  const icon = nativeImage.createFromPath(iconPath);
  // Colored psyduck icon (docs/psyduck.webp, background removed) — NOT a
  // template image, so the yellow duck shows as-is in the menu bar.

  const tray = new Tray(icon);
  tray.setToolTip("said-wat");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Settings…", click: () => onOpenSettings() },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ])
  );
  return tray;
}
