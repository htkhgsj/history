declare module 'flubber' {
  export function interpolate(
    fromShape: [number, number][] | string,
    toShape: [number, number][] | string,
    options?: { string?: boolean; maxSegmentLength?: number }
  ): (t: number) => string | [number, number][];
}
