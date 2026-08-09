// CJS preload (.cts) — sandboxed preloads must be CommonJS; the rest of the
// main build is ESM. The API surface mirrors shared/types.ts ElectronAPI.
// verbatimModuleSyntax forbids ESM import syntax in CJS files, so require is
// used here.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  capture: {
    confirm: (payload) => ipcRenderer.send("capture-confirm", payload),
    cancel: () => ipcRenderer.send("capture-cancel"),
    onInit: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on("capture-init", listener);
      return () => ipcRenderer.removeListener("capture-init", listener);
    },
  },
});
