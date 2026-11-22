/**
 * StudyHub Electron Preload 桥接脚本
 * - 开启 contextIsolation，安全地把主进程 IPC 方法暴露给 React 渲染进程
 * - 完全替代 localhost HTTP 请求与 SSE，实现真正的离线桌面客户端通信
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('studyhubIPC', {
  isElectron: true,
  platform: process.platform,

  getStatus: () => ipcRenderer.invoke('studyhub:getStatus'),
  setDataDir: (dataDir) => ipcRenderer.invoke('studyhub:setDataDir', dataDir),
  pickDataDir: () => ipcRenderer.invoke('studyhub:pickDataDir'),
  openDataDir: () => ipcRenderer.invoke('studyhub:openDataDir'),

  getVocab: () => ipcRenderer.invoke('studyhub:getVocab'),
  addVocab: (payload) => ipcRenderer.invoke('studyhub:addVocab', payload),
  updateVocab: (id, patch) => ipcRenderer.invoke('studyhub:updateVocab', id, patch),
  deleteVocab: (id) => ipcRenderer.invoke('studyhub:deleteVocab', id),
  recordReview: (id, remembered) => ipcRenderer.invoke('studyhub:recordReview', id, remembered),
  exportMarkdown: () => ipcRenderer.invoke('studyhub:exportMarkdown'),
  importInbox: (filename, data) => ipcRenderer.invoke('studyhub:importInbox', filename, data),

  getQuizzes: () => ipcRenderer.invoke('studyhub:getQuizzes'),
  importQuiz: (filename, quiz) => ipcRenderer.invoke('studyhub:importQuiz', filename, quiz),
  getResults: () => ipcRenderer.invoke('studyhub:getResults'),
  saveResult: (filename, result) => ipcRenderer.invoke('studyhub:saveResult', filename, result),

  lookup: (surface, options) => ipcRenderer.invoke('studyhub:lookup', surface, options),
  importDictCsv: (filename, content) => ipcRenderer.invoke('studyhub:importDictCsv', filename, content),

  onEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('studyhub:event', listener);
    return () => {
      ipcRenderer.removeListener('studyhub:event', listener);
    };
  },
});
