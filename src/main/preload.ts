import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { Action } from "../shared/messge";

/**
 * APIクラス
 */
export class ContextBridgeApi {
    public static readonly API_KEY = "api";
    public sendToMainProcess = (action: Action) => {
        return ipcRenderer.invoke(action.type, action);
    };

    public onSendToRenderer = <T extends Action>(type: T["type"], handler: (event: IpcRendererEvent, data: T["data"]) => unknown) => {
        return ipcRenderer.on(type, handler)
    };
}

/**
 * contextBridgeにAPIを登録する。
 */
contextBridge.exposeInMainWorld(
    ContextBridgeApi.API_KEY,
    new ContextBridgeApi()
);
