import React, { useState } from "react";
import { MotionVideo, onGestureHandler, onPixelChangeHandler } from "./MotionVideo";
import type { ContextBridgeApi } from "../main/preload";

type WindowWithAPI = typeof window & {
    api: ContextBridgeApi;
};
const api = (window as WindowWithAPI).api;

export const App = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const onChange: onPixelChangeHandler = (diff) => {
        api.sendToMainProcess("PixelChangeAction", diff);
        setLogs((prevState) =>
            [`${diff.diffPixelCount} pixel, ${String(diff.diffPercent)}%`].concat(prevState).slice(0, 30)
        );
    };
    const onGesture: onGestureHandler = (data) => {
        api.sendToMainProcess("GestureAction", data);
        setLogs((prevState) => [`${data.type}`].concat(prevState).slice(0, 30));
    };
    return (
        <div className={"App"}>
            <MotionVideo onChange={onChange} onGesture={onGesture} />
            <h3>Log</h3>
            {logs.map((log, index) => {
                return <li key={index}>{log}</li>;
            })}
        </div>
    );
};
