import { app, BrowserWindow, ipcMain } from 'electron';
import { ActionMap } from './shared/messge';
import { sendKeyStroke } from "./main/sendKeyStroke";
import { throttle } from 'throttle-typescript';
import path from "path";
import activeWin from "active-win";
import fs from "fs";
import { CreateConfig } from "./main/Config";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}
const onMessage = <T extends keyof ActionMap>(type: T, handler: (data: ActionMap[T]) => unknown) => {
    return ipcMain.handle(type, (event, args) => handler(args))
}
const getUserConfigFile = (): string | undefined => {
    try {
        const homedir = app.getPath("home");
        const userConfigPathList = path.join(homedir, ".config/motion-key/motion-key.config.js");
        return fs.existsSync(userConfigPathList) ? userConfigPathList : undefined;
    } catch {
        return undefined;
    }
};
const DEFAULT_CREATE_CONFIG: CreateConfig = ({
                                                 type,
                                                 payload
                                             }) => {
    if (type === "PixelChangeAction") {
        if ((payload as ActionMap["PixelChangeAction"]).diffPercent < 3) {
            return
        }
        return {
            key: "ArrowDown"
        }
    } else if (type === "GestureAction") {
        return {
            key: "ArrowUp"
        }
    }
};

const getConfig = async <T extends keyof ActionMap>({
                                                        type,
                                                        payload
                                                    }: { type: T, payload: ActionMap[T] }) => {
    try {
        const activeWindow = await activeWin.sync();
        if (!activeWindow) {
            console.error(new Error("Not found active window"));
            return;
        }
        const userConfigPath = getUserConfigFile();
        const userConfig: CreateConfig = typeof userConfigPath === "string" ? eval(`require("${userConfigPath}")`) : DEFAULT_CREATE_CONFIG;
        if (!userConfig) {
            return;
        }
        return userConfig({
            type,
            payload,
            path,
            app,
            activeWindow
        });
    } catch (error) {
        console.error(error);
        return null;
    }
}
const createWindow = (): void => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        height: 800,
        width: 1024,
        webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
            contextIsolation: true,
        },
    });

    // and load the index.html of the app.
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
    // mainWindow.setAlwaysOnTop(true, "floating");

    // Open the DevTools.
    mainWindow.webContents.openDevTools();
    let prevTimeMs = Date.now()
    let waitTimeMs = 1_000; // 1sec
    onMessage("PixelChangeAction", async (data) => {
        const currentTimeMs = Date.now();
        if (currentTimeMs - prevTimeMs < waitTimeMs) {
            console.info("Skip by waiting: PixelChangeAction", data)
            return;
        }
        prevTimeMs = currentTimeMs;
        console.info("PixelChangeAction", data);
        const config = await getConfig({
            type: "PixelChangeAction",
            payload: data
        });
        if (!config) {
            return;
        }
        if (config.throttleMs !== undefined) {
            waitTimeMs = config.throttleMs;
        }
        sendKeyStroke(config.key, config.modifier ?? {});
        // sendKeyStrokeThrottle("j", {});
    });
    onMessage("GestureAction", async (data) => {
        console.info("GestureAction", data);
        const currentTimeMs = Date.now();
        if (currentTimeMs - prevTimeMs < waitTimeMs) {
            console.info("Skip by waiting: GestureAction", data)
            return;
        }
        prevTimeMs = currentTimeMs;
        console.info("GestureAction", data)
        const config = await getConfig({
            type: "GestureAction",
            payload: data
        });
        if (!config) {
            return;
        }
        if (config.throttleMs !== undefined) {
            waitTimeMs = config.throttleMs;
        }
        sendKeyStroke(config.key, config.modifier ?? {});
    });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
