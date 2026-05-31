// useCalibration.ts

export interface CalibrationPoint {
  screenX: number;
  screenY: number;
  irisX:   number;
  irisY:   number;
}

export interface AffineTransform {
  ax: number; bx: number; cx: number;
  ay: number; by: number; cy: number;
}

// 9 punti in griglia 3x3
export function getCalibrationTargets(w: number, h: number) {
  const pad = 80;
  return [
    { x: w / 2,       y: h / 2       }, // centro
    { x: pad,         y: pad         }, // alto sinistra
    { x: w - pad,     y: pad         }, // alto destra
    { x: pad,         y: h - pad     }, // basso sinistra
    { x: w - pad,     y: h - pad     }, // basso destra
    { x: w / 2,       y: pad         }, // alto centro
    { x: w / 2,       y: h - pad     }, // basso centro
    { x: pad,         y: h / 2       }, // centro sinistra
    { x: w - pad,     y: h / 2       }, // centro destra
  ];
}

export function computeAffineTransform(
  points: CalibrationPoint[]
): AffineTransform | null {

  if (points.length < 4) return null;

  const n = points.length;
  let sumIx = 0, sumIy = 0, sumIx2 = 0, sumIy2 = 0, sumIxIy = 0;
  let sumSxIx = 0, sumSxIy = 0, sumSx = 0;
  let sumSyIx = 0, sumSyIy = 0, sumSy = 0;

  for (const p of points) {
    sumIx   += p.irisX;
    sumIy   += p.irisY;
    sumIx2  += p.irisX * p.irisX;
    sumIy2  += p.irisY * p.irisY;
    sumIxIy += p.irisX * p.irisY;
    sumSxIx += p.screenX * p.irisX;
    sumSxIy += p.screenX * p.irisY;
    sumSx   += p.screenX;
    sumSyIx += p.screenY * p.irisX;
    sumSyIy += p.screenY * p.irisY;
    sumSy   += p.screenY;
  }

  const M = [
    [sumIx2,  sumIxIy, sumIx],
    [sumIxIy, sumIy2,  sumIy],
    [sumIx,   sumIy,   n    ],
  ];

  const invM = invert3x3(M);
  if (!invM) return null;

  const bX = [sumSxIx, sumSxIy, sumSx];
  const bY = [sumSyIx, sumSyIy, sumSy];

  const [ax, bx, cx] = matVec3(invM, bX);
  const [ay, by, cy] = matVec3(invM, bY);

  return { ax, bx, cx, ay, by, cy };
}

export function applyTransform(
  t: AffineTransform,
  irisX: number,
  irisY: number
): { x: number; y: number } {
  return {
    x: t.ax * irisX + t.bx * irisY + t.cx,
    y: t.ay * irisX + t.by * irisY + t.cy,
  };
}

function invert3x3(m: number[][]): number[][] | null {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const det =
    a * (e * i - f * h) -
    b * (d * i - f * g) +
    c * (d * h - e * g);
  if (Math.abs(det) < 1e-10) return null;
  const inv = 1 / det;
  return [
    [ (e*i - f*h)*inv, -(b*i - c*h)*inv,  (b*f - c*e)*inv ],
    [-(d*i - f*g)*inv,  (a*i - c*g)*inv, -(a*f - c*d)*inv ],
    [ (d*h - e*g)*inv, -(a*h - b*g)*inv,  (a*e - b*d)*inv ],
  ];
}

function matVec3(m: number[][], v: number[]): number[] {
  return [
    m[0][0]*v[0] + m[0][1]*v[1] + m[0][2]*v[2],
    m[1][0]*v[0] + m[1][1]*v[1] + m[1][2]*v[2],
    m[2][0]*v[0] + m[2][1]*v[1] + m[2][2]*v[2],
  ];
}
