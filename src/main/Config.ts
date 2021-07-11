import Electron from "electron";
import path from "path";
import activeWin from "active-win";
import { ModifierOption } from "./sendKeyStroke";
import { ActionMap } from "../shared/messge";

export type UserConfig = {
    key: string;
    modifier?: ModifierOption;
    throttleMs?: number;
};
export type UserConfigCreatorArgs<T extends keyof ActionMap> = {
    type: T;
    payload: ActionMap[T];
    app: Electron.App;
    path: typeof path;
    activeWindow?: activeWin.Result;
};
export type CreateConfig = <T extends keyof ActionMap>(args: UserConfigCreatorArgs<T>) => UserConfig | undefined;
