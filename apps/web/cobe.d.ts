declare module "cobe" {
  interface COBEOptions {
    devicePixelRatio?: number
    width?: number
    height?: number
    phi?: number
    theta?: number
    dark?: number
    diffuse?: number
    mapSamples?: number
    mapBrightness?: number
    mapBaseBrightness?: number
    baseColor?: number[]
    glowColor?: number[]
    markerColor?: number[]
    markers?: Array<{ location: number[]; size: number }>
    onRender?: (state: { phi?: number }) => void
  }

  function createGlobe(canvas: HTMLCanvasElement, options: COBEOptions): {
    destroy: () => void
  }

  export default createGlobe
}