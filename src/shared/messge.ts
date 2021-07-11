import type { GestureDetectionType } from "../browser/MotionVideo";

export type ActionMap = {
    "PixelChangeAction": { diffPixelCount: number; diffPercent: number }
    "GestureAction": { type: GestureDetectionType }
}

