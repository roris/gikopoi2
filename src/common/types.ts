export type Direction = 'up' | 'down' | 'left' | 'right'
export type UserID = string

export interface Coordinates
{
    x: number;
    y: number;
}

export interface StreamSlot
{
    isActive: boolean,
    isReady: boolean,
    withSound: boolean | null,
    withVideo: boolean | null,
    userId: string | null,

    // Used only in frontend:
    mediaSource: MediaSource
    queue: ArrayBuffer[]
    isPlaying: boolean
    playFromQueue: any // is this still useful?
    initializationSegment: ArrayBuffer // is this still useful?
    sourceBuffer: SourceBuffer // is this still useful?
    src: string // is this still useful?
}

export interface Room
{
    id: string;
    scale: number;
    size: Coordinates;
    originCoordinates: Coordinates;
    backgroundImageUrl: string;
    backgroundImage: HTMLImageElement; // populated only on client side (could be deleted during refactoring, i think)
    backgroundColor: string;
    spawnPoint: {
        x: number;
        y: number;
        direction: Direction;
    };
    objects: {
        x: number;
        y: number;
        url: string;
        scale?: number;
        xOffset?: number;
        yOffset?: number;

        // Fields used only by frontend, please delete during refactoring:
        image: HTMLImageElement
        physicalPositionX: number
        physicalPositionY: number
    }[];
    sit: Coordinates[];
    blocked: Coordinates[];
    forbiddenMovements: { xFrom: number, yFrom: number, xTo: number, yTo: number }[],
    doors: {
        x: number,
        y: number,
        targetRoomId: string,
        targetX: number,
        targetY: number
    }[];
    streams: StreamSlot[];
    // users: Player[]
}

export interface Player
{
    id: string
    name: string
    position: { x: number, y: number }
    character: 'giko'
    direction: Direction
    connected: boolean
    roomId: string
    lastPing: number,
    mediaStream: MediaStream | null
}

export interface ServerStats {
    userCount: number
}

