import { loadImage } from "./utils.js"

export default class Character
{
    public characterName: string
    public frontSittingImage: HTMLImageElement | null = null;
    public frontStandingImage: HTMLImageElement | null = null;
    public frontWalking1Image: HTMLImageElement | null = null;
    public frontWalking2Image: HTMLImageElement | null = null;
    public backSittingImage: HTMLImageElement | null = null;
    public backStandingImage: HTMLImageElement | null = null;
    public backWalking1Image: HTMLImageElement | null = null;
    public backWalking2Image: HTMLImageElement | null = null;

    constructor(name: string)
    {
        this.characterName = name;
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