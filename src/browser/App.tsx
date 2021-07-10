import React, { useState } from "react";
import { MotionVideo, onPixelChangeHandler } from "./MotionVideo";
import type { ContextBridgeApi } from "../main/preload";
import { PixelChangeAction } from "../shared/messge";

type WindowWithAPI = typeof window & {
    api: ContextBridgeApi;
}
const api = (window as WindowWithAPI).api;

export const App = () => {
    const [pixelChange, setPixelChange] = useState<string[]>([]);
    const onChange: onPixelChangeHandler = diff => {
        api.sendToMainProcess({
            type: "PixelChangeAction",
            data: diff
        });
        setPixelChange(prevState => [`${String(diff.diffPercent)}%`].concat(prevState).slice(0, 30));
    };
    return <div className={"App"}>
        <MotionVideo onChange={onChange}/>
        <h3>Log</h3>
        {
            pixelChange.map((change, index) => {
                return <li key={index}>{change}</li>
            })
        }
    </div>
}
