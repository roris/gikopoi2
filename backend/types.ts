export interface Coordinates
{
    x: number;
    y: number;
}

export interface Room
{
    id: string;
    scale: number;
    grid: number[];
    originCoordinates: Coordinates;
    backgroundImageUrl: string;
    spawnPoint: {
        x: number;
        y: number;
        direction: 'up' | 'down' | 'left' | 'right';
    };
    objects: {
        x: number;
        y: number;
        url: string;
        image?: HTMLImageElement // TODO Refactor, this stuff is needed only by the frontend
        physicalPositionX?: number // TODO Refactor, this stuff is needed only by the frontend
        physicalPositionY?: number // TODO Refactor, this stuff is needed only by the frontend
    }[];
    sit: number[][];
    blocked: Coordinates[];
    doors: {
        x: number,
        y: number,
        targetRoomId: string,
        targetX: number,
        targetY: number
    }[];
    streams: {
        isActive: boolean,
        withSound: boolean | null,
        withVideo: boolean | null,
        userId: string | null,
    }[];
    // users: Player[]
}

export interface StreamRequest
{
    streamSlotId: number,
    withVideo: boolean,
    withSound: boolean
}
export interface StreamInfo extends StreamRequest
{
    userId: number
}