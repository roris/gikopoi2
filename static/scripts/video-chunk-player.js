const mimeType = 'video/webm; codecs="vorbis,vp8"'

export default class VideoChunkPlayer
{
    constructor(container)
    {
        this.isPlaying = false
        this.duration = 0
        
        this.videoElement = document.createElement("video")
        container.appendChild(this.videoElement)
        
        this.videoElement.autoplay = true
        this.videoElement.crossOrigin="anonymous"
        
        this.mediaSource = new MediaSource();
        
        this.queue = []

        this.mediaSource.addEventListener("sourceopen", (e) =>
        {
            console.log("sourceopen", e)
            this.sourceBuffer = this.mediaSource.addSourceBuffer(mimeType);
            this.sourceBuffer.mode = "sequence";
            this.sourceBuffer.addEventListener('updateend', () =>
            {
                console.log("updateend", this.queue)
                this.playFromQueue()
            });
        })
        
        this.videoElement.src = URL.createObjectURL(this.mediaSource);
        this.videoElement.play().catch(console.error)
    }
    
    playFromQueue()
    {
        console.log("playing from queue", this.queue.length)
        if (!this.queue.length)
        {
            this.isPlaying = false
            return
        }
        console.log("hooray")
        this.isPlaying = true
        this.sourceBuffer.appendBuffer(this.queue.shift())
    }

    playChunk(arrayBuffer)
    {
        console.log("playing chunk", this.mediaSource.readyState, this.sourceBuffer.updating, this.queue)
        if (this.mediaSource.readyState != "open")
            return
        this.queue.push(arrayBuffer)
        if (!this.isPlaying) this.playFromQueue()
    }
}
