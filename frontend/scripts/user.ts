import { Room } from "../../backend/types.js";
import Character from "./character.js";
import { calculateRealCoordinates, BLOCK_HEIGHT, BLOCK_WIDTH } from "./utils.js";

const STEP_LENGTH = 8;

export default class User
{
    public name: string
    public character: Character

    public logicalPositionX = 0;
    public logicalPositionY = 0;
    public currentPhysicalPositionX = 0;
    public currentPhysicalPositionY = 0;
    public isWalking = false;
    public direction: 'up' | 'down' | 'left' | 'right'  = "up";
    public framesUntilNextStep = STEP_LENGTH

    constructor(character: Character, name: string)
    {
        this.name = name;
        this.character = character;
    }

    moveImmediatelyToPosition(room: Room, logicalPositionX: number, logicalPositionY: number, direction: 'up' | 'down' | 'left' | 'right')
    {
        this.logicalPositionX = logicalPositionX;
        this.logicalPositionY = logicalPositionY;

        const realTargetCoordinates = calculateRealCoordinates(room, this.logicalPositionX, this.logicalPositionY);

        this.currentPhysicalPositionX = realTargetCoordinates.x;
        this.currentPhysicalPositionY = realTargetCoordinates.y;
        this.direction = direction;
    }

    moveToPosition(logicalPositionX: number, logicalPositionY: number, direction: 'up' | 'down' | 'left' | 'right')
    {
        if (this.logicalPositionX != logicalPositionX || this.logicalPositionY != logicalPositionY)
            this.isWalking = true;

        this.logicalPositionX = logicalPositionX;
        this.logicalPositionY = logicalPositionY;
        this.direction = direction;
    }

    // TODO really, find a better name for this function
    spendTime(room: Room)
    {
        const walkingSpeedX = BLOCK_WIDTH / 80
        const walkingSpeedY = BLOCK_HEIGHT / 80

        if (!this.isWalking)
            return

        const realTargetCoordinates = calculateRealCoordinates(room, this.logicalPositionX, this.logicalPositionY);

        const xDelta = Math.min(Math.abs(this.currentPhysicalPositionX - realTargetCoordinates.x), walkingSpeedX)
        const yDelta = Math.min(Math.abs(this.currentPhysicalPositionY - realTargetCoordinates.y), walkingSpeedY)

        if (this.currentPhysicalPositionX > realTargetCoordinates.x) this.currentPhysicalPositionX -= xDelta
        else if (this.currentPhysicalPositionX < realTargetCoordinates.x) this.currentPhysicalPositionX += xDelta

        if (this.currentPhysicalPositionY > realTargetCoordinates.y) this.currentPhysicalPositionY -= yDelta
        else if (this.currentPhysicalPositionY < realTargetCoordinates.y) this.currentPhysicalPositionY += yDelta

        if (xDelta === 0 && yDelta === 0)
            this.isWalking = false

        this.framesUntilNextStep--
        if (this.framesUntilNextStep < 0)
            this.framesUntilNextStep = STEP_LENGTH
    }

    getCurrentImage(room: Room)
    {
        if (this.isWalking)
        {
            switch (this.direction)
            {
                case "up":
                case "left":
                    return this.framesUntilNextStep > STEP_LENGTH / 2 ? this.character.backWalking1Image : this.character.backWalking2Image;
                case "down":
                case "right":
                    return this.framesUntilNextStep > STEP_LENGTH / 2 ? this.character.frontWalking1Image : this.character.frontWalking2Image;
            }
        }
        else
        {
            const isSitting = !!room.sit.find(s => s[0] == this.logicalPositionX && s[1] == this.logicalPositionY)

            switch (this.direction)
            {
                case "up":
                case "left":
                    return isSitting ? this.character.backSittingImage : this.character.backStandingImage;
                case "down":
                case "right":
                    return isSitting ? this.character.frontSittingImage : this.character.frontStandingImage;
            }
        }
    }
}