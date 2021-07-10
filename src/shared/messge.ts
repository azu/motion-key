export type Action = PixelChangeAction;
export type PixelChangeAction = {
    type: "PixelChangeAction",
    data: { diffPixelCount: number; diffPercent: number }
};
