import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import type { ActionMap } from "../shared/messge";

const API_KEY = "api";

/**
 * APIクラス
 */
export class ContextBridgeApi {
    public sendToMainProcess = <T extends keyof ActionMap>(key: T, data: ActionMap[T]) => {
        return ipcRenderer.invoke(key, data);
    };

    public onSendToRenderer = <T extends keyof ActionMap>(type: T, handler: (event: IpcRendererEvent, data: ActionMap[T]) => unknown) => {
        return ipcRenderer.on(type, handler)
    };
}

/**
 * contextBridgeにAPIを登録する。
 */
contextBridge.exposeInMainWorld(
    API_KEY,
    new ContextBridgeApi()
);
