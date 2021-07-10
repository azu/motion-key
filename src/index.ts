import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import { Action } from './shared/messge';
import { sendKeyStroke } from "./main/sendKeyStroke";
import { throttle } from 'throttle-typescript';
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}

const onMessage = <T extends Action>(type: T["type"], handler: (event: IpcMainInvokeEvent, data: T["data"]) => unknown) => {
    return ipcMain.handle(type, (event, args) => handler(event, args["data"]))
}

const createWindow = (): void => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        height: 600,
        width: 800,
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

    const sendKeyStrokeThrottle = throttle(sendKeyStroke, 1000);
    onMessage("PixelChangeAction", (event, data) => {
        console.log("diff: ", data);
        if (data.diffPixelCount > 5000) {
            sendKeyStrokeThrottle("j", {});
        }
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
