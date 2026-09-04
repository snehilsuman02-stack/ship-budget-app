const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sqlite", {
  get: (table) => ipcRenderer.invoke("sqlite:get", table),
  set: (table, value) => ipcRenderer.invoke("sqlite:set", table, value),
  remove: (table) => ipcRenderer.invoke("sqlite:remove", table),
});