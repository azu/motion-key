import { Listbox } from "@headlessui/react";
import React, { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "react-use-storage";
import pixelmatch from "pixelmatch";

const getDevices = async (): Promise<MediaDeviceInfo[]> => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(deviceInfo => deviceInfo.kind == "videoinput");
    if (videoDevices.length < 1) {
        alert("Not found video devices");
        throw new Error("Not found video devices");
    }
    return videoDevices;
}
const getMediaStream = (deviceId: string) => {
    return navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            deviceId: deviceId,
        },
    });
}
const messageName = "zero-timeout-message";
const setZeroTimeout = (function (global) {
    const handlers: (() => void)[] = [];

    const clear = () => {
        handlers.length = 0;
    }

    function handleMessage(event: MessageEvent) {
        if (event.source == global && event.data == messageName) {
            if (event.stopPropagation) {
                event.stopPropagation();
            }
            if (handlers.length) {
                handlers.shift()();
            }
        }
    }

    global.addEventListener("message", handleMessage, true);
    return function (handler: () => void) {
        handlers.push(handler);
        global.postMessage(messageName, "*");
        return () => clear();
    }
}(window));
const diffMemory: number[] = [];

const median = (sortedNumbers: number[]) => {
    const mid = Math.floor(sortedNumbers.length / 2);
    return sortedNumbers.length % 2 !== 0 ? sortedNumbers[mid] : (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2;
};

export type onPixelChangeHandler = (props: {  diffPixelCount: number; diffPercent: number }) => void;
export const useMotion = ({
                              canvasRef,
                              videoRef,
                              onChange,
                              intervalMs = 500,
                              minimalDiff = 500
                          }: {
    canvasRef: RefObject<HTMLCanvasElement>
    videoRef: RefObject<HTMLVideoElement>;
    onChange: onPixelChangeHandler;
    intervalMs?: number;
    minimalDiff?: number;
}) => {

    useEffect(() => {
        const offscreen = canvasRef.current;
        const offscreenCtx = offscreen.getContext("2d");
        if (!offscreenCtx) {
            throw new Error("Can not get offscreenTop canvas");
        }
        const videoElement = videoRef.current;
        const onloadmetadata = () => {
            offscreen.width = videoElement.width;
            offscreen.height = videoElement.height;
            // document.body.appendChild(offscreen);
            offscreenCtx.drawImage(videoElement, 0, 0, videoElement.width, videoElement.height);
        };
        videoElement.addEventListener("loadedmetadata", onloadmetadata);
        // 12fps?
        let clearTimeout: null | (() => void) = null;
        let prev = performance.now();
        const tick = () => {
            const current = performance.now();
            if ((current - prev) < intervalMs) {
                clearTimeout = setZeroTimeout(() => tick());
                return;
            }
            prev = current;
            // get diffs
            const videoWidth = videoElement.width;
            const videoHeight = videoElement.height;
            const prevImage = offscreenCtx.getImageData(0, 0, videoWidth, videoHeight);
            offscreenCtx.drawImage(videoElement, 0, 0, videoElement.width, videoElement.height);
            const newImage = offscreenCtx.getImageData(0, 0, videoWidth, videoHeight);
            const diffPixelCount = pixelmatch(prevImage.data, newImage.data, null, videoWidth, videoHeight);
            diffMemory.push(diffPixelCount);
            const medianDiff = median(diffMemory);
            if (medianDiff < minimalDiff) {
                clearTimeout = setZeroTimeout(() => tick());
                return;
            }
            const diffPercent = (diffPixelCount / newImage.data.length) * 100;
            onChange({
                diffPixelCount: medianDiff,
                diffPercent,
            });
            // reset
            diffMemory.length = 0;
            // console.log("diff %i, percent: %s", diff, (diff / newImage.data.length) * 100);
            clearTimeout = setZeroTimeout(() => tick());
        };
        clearTimeout = setZeroTimeout(() => tick());
        // https://w3c.github.io/uievents/tools/key-event-viewer.html
        return () => {
            videoElement.removeEventListener("loadedmetadata", onloadmetadata)
            clearTimeout && clearTimeout;
        };
    }, [canvasRef, onChange, videoRef]);
};

export const useMotionVideo = ({ videoRef }: { videoRef: RefObject<HTMLVideoElement> }) => {
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useLocalStorage<string>("selected-video-device-id");
    const [mediaStream, setMediaStream] = useState<MediaStream>();
    useEffect(() => {
        (async function inEffect() {
            const devices = await getDevices();
            setDevices(devices);
        })()
    }, []);
    useEffect(() => {
        (async function inEffect() {
            if (!selectedDeviceId) {
                setSelectedDeviceId(devices[0].deviceId);
            }
        })()
    }, [devices, selectedDeviceId, setSelectedDeviceId]);
    useEffect(() => {
        (async function inEffect() {
            if (!selectedDeviceId) {
                console.warn("No selected device");
                return;
            }
            console.log("selectedDevice", selectedDeviceId);
            const mediaStream = await getMediaStream(selectedDeviceId);
            setMediaStream(mediaStream);
        })()
    }, [selectedDeviceId]);
    useEffect(() => {
        console.log(videoRef.current, mediaStream)
        if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.play();
        }
    }, [mediaStream, videoRef]);
    const handleSelectDevice = useCallback((deviceId: string) => {
        setSelectedDeviceId(deviceId);
    }, [setSelectedDeviceId]);
    return [{ videoRef, selectedDeviceId, devices }, { handleSelectDevice }] as const;
}
export type MotionVideoProps = {
    onChange: onPixelChangeHandler;
}
export const MotionVideo = (props: MotionVideoProps) => {
    const canvasRef = useRef<HTMLCanvasElement>();
    const videoRef = useRef<HTMLVideoElement>();
    useMotion({
        videoRef,
        canvasRef,
        onChange: props.onChange
    })
    const [{ devices, selectedDeviceId }, { handleSelectDevice }] = useMotionVideo({ videoRef });
    return <div>
        <Listbox value={selectedDeviceId} onChange={handleSelectDevice}>
            <Listbox.Button>{"device"}</Listbox.Button>
            <Listbox.Options>
                {devices?.map((device) => (
                    <Listbox.Option
                        key={device.deviceId}
                        value={device.deviceId}
                    >
                        {device.label}
                    </Listbox.Option>
                ))}
            </Listbox.Options>
        </Listbox>
        <video ref={videoRef} width={240} height={320}>
            <canvas ref={canvasRef}/>
        </video>
    </div>
}
