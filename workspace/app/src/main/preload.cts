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
    send: (draft) => ipcRenderer.send("note-send", draft),
    copy: (text) => ipcRenderer.send("note-copy", text),
  },
  thread: {
    get: () => ipcRenderer.invoke("thread-get"),
  },
  polish: {
    get: () => ipcRenderer.invoke("polish-get"),
    send: (feedback) => ipcRenderer.send("polish-feedback", feedback),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings-get"),
    setHotkeys: (hotkeys) => ipcRenderer.invoke("settings-set-hotkeys", hotkeys),
    setModel: (model) => ipcRenderer.invoke("settings-set-model", model),
    testConnection: () => ipcRenderer.invoke("settings-test-connection"),
    setRecording: (active) => ipcRenderer.send("settings-recording", active),
  },
});
