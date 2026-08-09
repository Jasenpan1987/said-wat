// CJS preload (.cts) — sandboxed preloads must be CommonJS; the rest of the
// main build is ESM. The API surface mirrors shared/types.ts ElectronAPI.
// verbatimModuleSyntax forbids ESM import syntax in CJS files, so require is
// used here.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  capture: {
    confirm: (payload) => ipcRenderer.send("capture-confirm", payload),
    cancel: () => ipcRenderer.send("capture-cancel"),
    ready: () => ipcRenderer.send("capture-ready"),
    onInit: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on("capture-init", listener);
      return () => ipcRenderer.removeListener("capture-init", listener);
    },
  },
  note: {
    onShow: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on("note-show", listener);
      return () => ipcRenderer.removeListener("note-show", listener);
    },
    dismiss: () => ipcRenderer.send("note-dismiss"),
    retry: () => ipcRenderer.send("note-retry"),
  },
});
