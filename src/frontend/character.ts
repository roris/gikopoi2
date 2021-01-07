import { loadImage } from "./utils.js"

export default class Character
{
    characterName: string;

    frontSittingImage: HTMLImageElement | null = null;
    frontStandingImage: HTMLImageElement | null = null;
    frontWalking1Image: HTMLImageElement | null = null;
    frontWalking2Image: HTMLImageElement | null = null;
    backSittingImage: HTMLImageElement | null = null;
    backStandingImage: HTMLImageElement | null = null;
    backWalking1Image: HTMLImageElement | null = null;
    backWalking2Image: HTMLImageElement | null = null;
    
    constructor(name: string)
    {
        this.characterName = name
    }

    async loadImages()
    {
        this.frontSittingImage = await loadImage("characters/" + this.characterName + "/front-sitting.png");
        this.frontStandingImage = await loadImage("characters/" + this.characterName + "/front-standing.png");
        this.frontWalking1Image = await loadImage("characters/" + this.characterName + "/front-walking-1.png");
        this.frontWalking2Image = await loadImage("characters/" + this.characterName + "/front-walking-2.png");
        this.backSittingImage = await loadImage("characters/" + this.characterName + "/back-sitting.png");
        this.backStandingImage = await loadImage("characters/" + this.characterName + "/back-standing.png");
        this.backWalking1Image = await loadImage("characters/" + this.characterName + "/back-walking-1.png");
        this.backWalking2Image = await loadImage("characters/" + this.characterName + "/back-walking-2.png");
    }
}