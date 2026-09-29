export interface PathPoint {
  x: number;
  y: number;
  groundY: number;
  angleY: number;
  pitchX: number;
}

export interface PathSegmentProvider {
  startZ: number;
  endZ: number;
  startX: number;
  endX: number;
  startY: number;
  endY: number;
  getPath(z: number): PathPoint;
}

export class PathTracker {
  private segments: PathSegmentProvider[] = [];

  public clear() {
    this.segments = [];
  }

  public addSegment(segment: PathSegmentProvider) {
    this.segments.push(segment);
  }

  public removeSegment(segment: PathSegmentProvider) {
    const idx = this.segments.indexOf(segment);
    if (idx !== -1) {
      this.segments.splice(idx, 1);
    }
  }

  public getPathAt(z: number): PathPoint {
    if (this.segments.length === 0) {
      return { x: 0, y: 0, groundY: 0, angleY: 0, pitchX: 0 };
    }

    // Binary search or linear scan since active segments list is short (~7 items)
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      if (z >= seg.startZ && z <= seg.endZ) {
        return seg.getPath(z);
      }
    }

    // If ahead of latest segment, extrapolate from last
    const last = this.segments[this.segments.length - 1];
    if (z > last.endZ) {
      return last.getPath(last.endZ);
    }

    // If behind first segment
    const first = this.segments[0];
    return first.getPath(first.startZ);
  }
}

export const pathTracker = new PathTracker();
