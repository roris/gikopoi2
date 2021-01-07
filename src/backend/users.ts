import { v4 } from "uuid";
import { Player } from "../common/types";
import { defaultRoom } from "./rooms";

function generateId()
{
    return v4()
}

const users: { [id: string]: Player; } = {}

export function addNewUser(name: string)
{
    const p: Player = {
        id: generateId(),
        name: "Anonymous",
        position: { x: defaultRoom.spawnPoint.x, y: defaultRoom.spawnPoint.y },
        character: 'giko',
        direction: defaultRoom.spawnPoint.direction,
        connected: true,
        roomId: defaultRoom.id,
        lastPing: Date.now(),
        mediaStream: null,
    };
    users[p.id] = p;

    return p;
};

export function getConnectedUserList(roomId: string | null): Player[]
{
    if (roomId)
        return Object.values(users).filter(u => u.roomId == roomId)
    else
        return Object.values(users)
};

export function getUser(userId: string)
{
    return users[userId];
};

export function removeUser(user: Player)
{
    delete users[user.id];
}
