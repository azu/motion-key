import { Listbox } from "@headlessui/react";
import React, { MutableRefObject, RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "react-use-storage";
import pixelmatch from "pixelmatch";
// @ts-expect-error no type
import * as fp from "fingerpose";

declare let handpose: any;
const VIDEO_CONFIG = {
    video: { width: 320, height: 240, fps: 12 }
};
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
            ...VIDEO_CONFIG.video,
            deviceId: deviceId,
        },
    });
}
const messageName = "zero-timeout-message";
// configure gesture estimator
// add "✌️" and "👍" as sample gestures
const knownGestures = [
    fp.Gestures.VictoryGesture,
    fp.Gestures.ThumbsUpGesture
];
const GE = new fp.GestureEstimator(knownGestures);
const gestureStrings = {
    'thumbs_up': '👍',
    'victory': '✌️'
};
export type GestureDetectionType = "👍" | "✌️";
const estimateHands = async (video: HTMLVideoElement): Promise<GestureDetectionType | null> => {
    const model = await handpose.load();
    // get hand landmarks from video
    // Note: Handpose currently only detects one hand at a time
    // Therefore the maximum number of predictions is 1
    const predictions = await model.estimateHands(video, true);
    for (let i = 0; i < predictions.length; i++) {
        // now estimate gestures based on landmarks
        // using a minimum confidence of 7.5 (out of 10)
        const est = GE.estimate(predictions[i].landmarks, 7.5);
        if (est.gestures.length > 0) {
            // find gesture with highest confidence
            const result = est.gestures.reduce((p: any, c: any) => {
                return (p.confidence > c.confidence) ? p : c;
            });
            // @ts-expect-error no type
            return gestureStrings[result.name] as GestureKeys
        }
    }
    return null;
};

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
                handlers.shift()?.();
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

export type onPixelChangeHandler = (props: { diffPixelCount: number; diffPercent: number }) => void;
export type onGestureHandler = (props: { type: GestureDetectionType }) => void;
export const useMotion = ({
                              canvasRef,
                              poseCanvasRef,
                              videoRef,
                              onChange,
                              onGesture,
                              intervalMs = 500,
                              minimalDiff = 500
                          }: {
    canvasRef: MutableRefObject<HTMLCanvasElement | null>
    poseCanvasRef: MutableRefObject<HTMLCanvasElement | null>
    videoRef: MutableRefObject<HTMLVideoElement | null>;
    onChange: onPixelChangeHandler;
    onGesture: onGestureHandler;
    intervalMs?: number;
    minimalDiff?: number;
}) => {

    useEffect(() => {
        const offscreen = canvasRef.current;
        if (!offscreen) {
            return;
        }
        const offscreenCtx = offscreen.getContext("2d");
        if (!offscreenCtx) {
            throw new Error("Can not get offscreenTop canvas");
        }
        const poseCtx = poseCanvasRef.current?.getContext("2d");
        if (!poseCtx) {
            throw new Error("Can not get poseCtx canvas");
        }
        const videoElement = videoRef.current;
        if (!videoElement) {
            return;
        }
        const onloadmetadata = () => {
            offscreen.width = videoElement.width;
            offscreen.height = videoElement.height;
            // document.body.appendChild(offscreen);
            offscreenCtx.drawImage(videoElement, 0, 0, videoElement.width, videoElement.height);
            clearTimeout = setZeroTimeout(() => tick());
        };
        videoElement.addEventListener("loadedmetadata", onloadmetadata);
        let clearTimeout: null | (() => void) = null;
        let prev = performance.now();
        const tick = () => {
            const current = performance.now();
            if ((current - prev) < intervalMs) {
                clearTimeout = setZeroTimeout(() => tick());
                return;
            }
            prev = current;
            // gesture detection
            estimateHands(videoElement).then(result => {
                if (result) {
                    onGesture({ type: result })
                }
            });
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
        if (videoElement.readyState >= 2) {
            clearTimeout = setZeroTimeout(() => tick());
        }
        // https://w3c.github.io/uievents/tools/key-event-viewer.html
        return () => {
            videoElement.removeEventListener("loadedmetadata", onloadmetadata)
            clearTimeout && clearTimeout();
        };
    }, [canvasRef, intervalMs, minimalDiff, onChange, poseCanvasRef, videoRef]);
};

export const useMotionVideo = ({ videoRef }: { videoRef: MutableRefObject<HTMLVideoElement | null> }) => {
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
            const mediaStream = await getMediaStream(selectedDeviceId);
            setMediaStream(mediaStream);
        })()
    }, [selectedDeviceId]);
    useEffect(() => {
        const videoElement = videoRef.current;
        if (videoElement && mediaStream) {
            videoElement.srcObject = mediaStream;
            videoElement.play();
        }
    }, [mediaStream, videoRef]);
    const handleSelectDevice = useCallback((deviceId: string) => {
        setSelectedDeviceId(deviceId);
    }, [setSelectedDeviceId]);
    return [{ videoRef, selectedDeviceId, devices }, { handleSelectDevice }] as const;
}
export type MotionVideoProps = {
    onChange: onPixelChangeHandler;
    onGesture: onGestureHandler;
}
export const MotionVideo = (props: MotionVideoProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const poseCanvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    useMotion({
        videoRef,
        canvasRef,
        poseCanvasRef,
        onChange: props.onChange,
        onGesture: props.onGesture
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
        <video ref={videoRef} width={VIDEO_CONFIG.video.width} height={VIDEO_CONFIG.video.height}>
        </video>
        <canvas ref={canvasRef} hidden={true}/>
        <canvas ref={poseCanvasRef} hidden={true}/>
    </div>
}
