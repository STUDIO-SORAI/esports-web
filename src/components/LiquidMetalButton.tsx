"use client";

import React, { useEffect, useRef } from "react";

export interface LiquidMetalButtonProps {
  href?: string;
  runningCount?: number;
  className?: string;
}

const VERT_SRC = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG_SCENE_SRC = `#version 300 es
precision highp float;
out vec4 o;

uniform vec2 uC;
uniform vec2 uHalf;
uniform float uT;
uniform float uHover;
uniform float uPress;
uniform vec4 uRip[3];
uniform vec4 uRipK;
uniform vec4 uRipK2;
uniform vec4 uPtr;
uniform vec4 uPtrK;
uniform float uP[21];

#define PI 3.14159265359

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float ripple(vec2 p, float t) {
  float sum = 0.0;
  for(int i = 0; i < 3; i++) {
    if(uRip[i].w < 0.5) continue;
    float age = t - uRip[i].z;
    if(age < 0.0 || age > 4.0) continue;
    vec2 rp = p - uRip[i].xy;
    float facet = 1.0 + uRipK2.x * cos(uRipK2.y * atan(rp.y, rp.x) + age * 2.1 + float(i) * 2.4);
    float x = (length(rp) - age * uRipK.x * facet) / uRipK.y;
    sum += exp(-pow(abs(x) + 1e-4, uRipK2.z)) * exp(-age * uRipK.z);
  }
  return sum;
}

float pointerW(vec2 p) {
  if(uPtr.z < 0.001) return 0.0;
  float d = length(p - uPtr.xy) / uPtrK.x;
  return exp(-d * d) * uPtr.z;
}

vec2 pointerWarp(vec2 p) {
  float w = pointerW(p);
  if(w <= 0.0) return vec2(0.0);
  return normalize(p - uPtr.xy + vec2(1e-5)) * w * (uPtrK.y + uPtrK.z * uPtr.w);
}

float h21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = h21(i), b = h21(i + vec2(1.0, 0.0)), c = h21(i + vec2(0.0, 1.0)), d = h21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) * 2.0 - 1.0;
}

float fbm(vec2 p, float g) {
  float s = 0.0, a = 1.0, n = 0.0;
  for(int i = 0; i < 4; i++) {
    s += a * vn(p);
    n += a;
    p = p * 2.03 + 11.7;
    a *= g;
  }
  return s / n;
}

float wig(float x, float t, float seed) {
  return vn(vec2(x, t * 0.150 + seed)) * 0.60
       + vn(vec2(x * 2.07 + 4.0, t * 0.105 + seed)) * 0.27
       + vn(vec2(x * 4.30 - 7.0, t * 0.080 + seed)) * 0.13;
}

float valleyAt(vec2 p, float t) { return wig(p.x * uP[0], t, 0.0) * uP[1]; }
float densAt(vec2 p, float t) { return uP[2] * exp(uP[3] * wig(p.x * uP[4] + 9.0, t, 2.7)); }

float surface(vec2 p, float t) {
  float V = (p.y - valleyAt(p, t)) * densAt(p, t);
  V += uP[5] * fbm(p * vec2(0.8, 1.7) * uP[6] + vec2(t * 0.05, -t * 0.03), uP[17]);
  return V - uP[7];
}

float tone(float v) {
  float u = fract(v);
  float e = uP[9], W = uP[10] * 0.5;
  return smoothstep(0.5 - W - e, 0.5 - W, u) * (1.0 - smoothstep(0.5 + W, 0.5 + W + e, u));
}

vec3 spec(float t) {
  vec3 base = clamp(vec3(1.5) - abs(4.0 * t - vec3(3.0, 2.0, 1.0)), 0.0, 1.0);
  vec3 redGrad = vec3(base.r * 1.85 + base.g * 0.45, base.g * 0.08 + base.b * 0.05, base.b * 0.12);
  return mix(redGrad, vec3(1.6, 0.06, 0.12), 0.75);
}

void main() {
  vec2 d = gl_FragCoord.xy - uC;
  float rad = min(uHalf.y, 14.0);
  float sd = sdRoundedBox(d, uHalf, rad);
  float pill = 1.0 - smoothstep(-1.0, 1.0, sd);
  float S = uHalf.y * 2.0;
  float t = uT;

  if(uHover <= 0.0015 || pill <= 0.0015) {
    o = vec4(0.0, 0.0, 0.0, pill);
    return;
  }

  vec2 p = vec2(d.x, -d.y) / S;
  vec2 q = p + pointerWarp(p);

  float h0 = surface(q, t);
  vec2 gp = vec2(dFdx(h0), -dFdy(h0)) * S;
  float V = surface(q - gp * uP[8] / max(uP[2], 0.001), t);

  vec2 gd = normalize(gp + vec2(1e-5));
  V += uP[13] * fbm(vec2(dot(q, gd) * uP[14], dot(q, vec2(-gd.y, gd.x)) * uP[14] * 0.04) + vec2(0.0, t * 0.06), 0.5);

  float rip = ripple(p, t);
  float well = pointerW(p);
  V += rip * uRipK.w;

  const int N = 21;
  float mid = 1.0 - pow(0.5, uP[12]);
  vec3 col = vec3(0.0), wsum = vec3(0.0);
  for(int i = 0; i < N; i++) {
    float k = float(i) / float(N - 1);
    vec3 w = spec(k);
    col += w * tone(V + ((1.0 - pow(1.0 - k, uP[12])) - mid) * uP[11]);
    wsum += w;
  }
  col /= wsum;
  col = pow(col, vec3(uP[15]));

  float lit = smoothstep(uP[18], uP[19], q.y - valleyAt(q, t));
  lit *= mix(1.0, lit, 0.55);
  col *= uP[16] * lit;

  col = col * (1.0 + rip * 1.15 + well * 0.60);

  o = vec4(col * pill * uHover, pill);
}
`;

const FRAG_RIM_SRC = `#version 300 es
precision highp float;
out vec4 o;

uniform vec2 uC;
uniform vec2 uHalf;
uniform float uT;
uniform float uHover;
uniform float uPress;
uniform vec4 uRip[3];
uniform vec4 uRipK;
uniform vec4 uRipK2;
uniform vec4 uPtr;
uniform vec4 uPtrK;
uniform float uBw;
uniform float uE[8];

#define PI 3.14159265359

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float ripple(vec2 p, float t) {
  float sum = 0.0;
  for(int i = 0; i < 3; i++) {
    if(uRip[i].w < 0.5) continue;
    float age = t - uRip[i].z;
    if(age < 0.0 || age > 4.0) continue;
    vec2 rp = p - uRip[i].xy;
    float facet = 1.0 + uRipK2.x * cos(uRipK2.y * atan(rp.y, rp.x) + age * 2.1 + float(i) * 2.4);
    float x = (length(rp) - age * uRipK.x * facet) / uRipK.y;
    sum += exp(-pow(abs(x) + 1e-4, uRipK2.z)) * exp(-age * uRipK.z);
  }
  return sum;
}

float pointerW(vec2 p) {
  if(uPtr.z < 0.001) return 0.0;
  float d = length(p - uPtr.xy) / uPtrK.x;
  return exp(-d * d) * uPtr.z;
}

float perim(vec2 d, float a, float r) {
  float P = 4.0 * a + 2.0 * PI * r;
  float s;
  if(d.x >= a) {
    float th = atan(d.y, d.x - a); if(th < 0.0) th += 2.0 * PI;
    s = (th <= PI * 0.5) ? r * th : P - r * (2.0 * PI - th);
  } else if(d.x <= -a) {
    float th = atan(d.y, d.x + a); if(th < 0.0) th += 2.0 * PI;
    s = r * PI * 0.5 + 2.0 * a + r * (th - PI * 0.5);
  } else if(d.y >= 0.0) {
    s = r * PI * 0.5 + (a - d.x);
  } else {
    s = r * PI * 1.5 + 2.0 * a + (d.x + a);
  }
  return s / P;
}

float pb(float u, float w) {
  u = fract(u);
  float x = min(u, 1.0 - u);
  return exp(-(x * x) / (w * w));
}

float rimHot(float s, float t) {
  float v = uE[0];
  v += 0.62 * pb(s - t * uE[4], 0.075);
  v += 0.44 * pb(s + t * uE[4] * 0.63 + 0.41, 0.135);
  v += 0.30 * pb(s - t * uE[4] * 0.34 + 0.73, 0.200);
  return v;
}

float rimBand(float sd, float off) {
  return 1.0 - smoothstep(0.0, uBw * 1.05, abs(sd + uBw * 0.55 + off));
}

void main() {
  vec2 d = gl_FragCoord.xy - uC;
  float rad = min(uHalf.y, 14.0);
  float sd = sdRoundedBox(d, uHalf, rad);
  if(sd > uBw * 2.5 || sd < -uBw * 3.5) {
    o = vec4(0.0);
    return;
  }

  float a = max(uHalf.x - rad, 0.0);
  float s = perim(d, a, rad);
  float top = mix(1.0, 0.5 + 0.5 * (d.y / uHalf.y), uE[5]);

  vec2 p = vec2(d.x, -d.y) / (uHalf.y * 2.0);
  float lift = 1.0 + uPress * uE[6] + ripple(p, uT) * uE[7] + pointerW(p) * uPtrK.w;

  o = vec4(vec3(
    rimBand(sd, uE[2]) * rimHot(s + uE[3], uT) * 1.60,
    rimBand(sd, 0.0) * rimHot(s, uT) * 0.20,
    rimBand(sd, -uE[2]) * rimHot(s - uE[3], uT) * 0.25
  ) * uE[1] * top * lift, 1.0);
}
`;

const FRAG_DOWN_SRC = `#version 300 es
precision highp float;
out vec4 o;
uniform sampler2D uTex, uTex2;
uniform vec2 uDstTexel;
uniform vec2 uSrcTexel;
uniform float uAdd;
void main() {
  vec2 uv = gl_FragCoord.xy * uDstTexel;
  vec2 e = uDstTexel * 0.25;
  vec4 s = texture(uTex, uv + vec2(-e.x, -e.y)) + texture(uTex, uv + vec2(e.x, -e.y))
         + texture(uTex, uv + vec2(-e.x, e.y)) + texture(uTex, uv + vec2(e.x, e.y));
  s *= 0.25;
  if(uAdd > 0.5) {
    vec4 r = texture(uTex2, uv + vec2(-e.x, -e.y)) + texture(uTex2, uv + vec2(e.x, -e.y))
           + texture(uTex2, uv + vec2(-e.x, e.y)) + texture(uTex2, uv + vec2(e.x, e.y));
    s.rgb += r.rgb * 0.25;
  }
  o = s;
}
`;

const FRAG_BLUR_SRC = `#version 300 es
precision highp float;
out vec4 o;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform vec2 uDir;
uniform float uR;
void main() {
  vec2 uv = gl_FragCoord.xy * uTexel;
  vec2 st = uTexel * uDir * uR;
  vec4 s = texture(uTex, uv) * 0.1964;
  s += (texture(uTex, uv + st * 1.4118) + texture(uTex, uv - st * 1.4118)) * 0.2969;
  s += (texture(uTex, uv + st * 3.2941) + texture(uTex, uv - st * 3.2941)) * 0.0944;
  s += (texture(uTex, uv + st * 5.1765) + texture(uTex, uv - st * 5.1765)) * 0.0104;
  o = s;
}
`;

const FRAG_COMP_SRC = `#version 300 es
precision highp float;
out vec4 o;

uniform sampler2D uSoft, uRim, uGlow;
uniform vec2 uRes;
uniform vec2 uC;
uniform vec2 uHalf;
uniform float uT;
uniform vec4 uRip[3];
uniform vec4 uRipK;
uniform vec4 uRipK2;
uniform float uGlowGain;
uniform float uGlowIn;
uniform float uOccl;
uniform float uDim;
uniform float uPunch;

#define PI 3.14159265359

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float ripple(vec2 p, float t) {
  float sum = 0.0;
  for(int i = 0; i < 3; i++) {
    if(uRip[i].w < 0.5) continue;
    float age = t - uRip[i].z;
    if(age < 0.0 || age > 4.0) continue;
    vec2 rp = p - uRip[i].xy;
    float facet = 1.0 + uRipK2.x * cos(uRipK2.y * atan(rp.y, rp.x) + age * 2.1 + float(i) * 2.4);
    float x = (length(rp) - age * uRipK.x * facet) / uRipK.y;
    sum += exp(-pow(abs(x) + 1e-4, uRipK2.z)) * exp(-age * uRipK.z);
  }
  return sum;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 glow = texture(uGlow, uv).rgb;

  vec2 d = gl_FragCoord.xy - uC;
  float rad = min(uHalf.y, 14.0);
  float sd = sdRoundedBox(d, uHalf, rad);
  float pill = 1.0 - smoothstep(-1.0, 1.0, sd);

  vec4 m = texture(uSoft, uv);
  float veil = 1.0 - smoothstep(0.46, 0.88, abs(d.y) / uHalf.y);
  vec3 metal = pow(max(m.rgb / max(m.a, 1e-3), 0.0), vec3(uPunch));

  vec3 core = metal * pill * mix(1.0, uDim, veil);
  float rip = ripple(vec2(d.x, -d.y) / (uHalf.y * 2.0), uT);
  core += vec3(rip * rip) * uRipK2.w * pill * mix(1.0, 0.42, veil);

  float sdSh = sdRoundedBox(d + vec2(0.0, uHalf.y * 0.62), uHalf * 0.94, rad * 0.94);
  float occl = uOccl * exp(-max(sdSh, 0.0) / (uHalf.y * 0.75));

  vec3 redGlow = glow * vec3(1.65, 0.16, 0.20);
  vec3 rgb = (core + redGlow * uGlowGain * mix(1.0, uGlowIn, pill) * (1.0 - occl * (1.0 - pill))) * pill;
  float a = clamp(max(rgb.r, max(rgb.g, rgb.b)), 0.0, 1.0) * pill;
  o = vec4(min(rgb, vec3(1.0)), a);
}
`;

export function LiquidMetalButton({
  href = "/matches",
  runningCount = 0,
  className = "",
}: LiquidMetalButtonProps) {
  const containerRef = useRef<HTMLAnchorElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    });
    if (!gl) return;

    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = (fs: string) => {
      const p = gl.createProgram()!;
      gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT_SRC));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, "position");
      gl.linkProgram(p);
      const u: Record<string, WebGLUniformLocation | null> = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i)!;
        u[info.name.replace("[0]", "")] = gl.getUniformLocation(p, info.name);
      }
      return { p, u };
    };

    const pScene = prog(FRAG_SCENE_SRC);
    const pRim = prog(FRAG_RIM_SRC);
    const pDown = prog(FRAG_DOWN_SRC);
    const pBlur = prog(FRAG_BLUR_SRC);
    const pComp = prog(FRAG_COMP_SRC);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const hasFloat = !!gl.getExtension("EXT_color_buffer_half_float");
    const makeTarget = () => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tex,
        0
      );
      return { tex, fbo, w: 0, h: 0 };
    };

    const sizeTarget = (
      t: { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number },
      w: number,
      h: number
    ) => {
      if (t.w === w && t.h === h) return;
      t.w = w;
      t.h = h;
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      if (hasFloat) {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA16F,
          w,
          h,
          0,
          gl.RGBA,
          gl.HALF_FLOAT,
          null
        );
      } else {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA8,
          w,
          h,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null
        );
      }
    };

    const T_core = makeTarget();
    const T_rim = makeTarget();
    const T_s1 = makeTarget();
    const T_s2 = makeTarget();
    const T_a = makeTarget();
    const T_b = makeTarget();

    let W = 0,
      H = 0,
      DPR = 1,
      BW = 0,
      BH = 0,
      CX = 0,
      CY = 0;
    let DOWN = 4;
    const GLOW_TEX = 129;

    const resize = () => {
      if (!canvas || !container) return;
      const r = container.getBoundingClientRect();
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(2, Math.round(r.width * DPR));
      const h = Math.max(2, Math.round(r.height * DPR));
      if (w !== W || h !== H) {
        W = w;
        H = h;
        canvas.width = W;
        canvas.height = H;
      }
      BW = w;
      BH = h;
      CX = W * 0.5;
      CY = H * 0.5;
      sizeTarget(T_core, W, H);
      sizeTarget(T_rim, W, H);
      const hw = Math.max(2, Math.ceil(W / 2));
      const hh = Math.max(2, Math.ceil(H / 2));
      sizeTarget(T_s1, hw, hh);
      sizeTarget(T_s2, hw, hh);
      DOWN = Math.max(1, Math.min(4, Math.round(BH / GLOW_TEX)));
      const dw = Math.max(2, Math.ceil(W / DOWN));
      const dh = Math.max(2, Math.ceil(H / DOWN));
      sizeTarget(T_a, dw, dh);
      sizeTarget(T_b, dw, dh);
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const drawTo = (
      t: { fbo: WebGLFramebuffer; w: number; h: number } | null
    ) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fbo : null);
      gl.viewport(0, 0, t ? t.w : W, t ? t.h : H);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const P = [
      0.5, 0.55, 2.4, 2.2, 0.32, 0.12, 1.6, 0.05, 0.18, 0.04, 0.46, 0.3,
      1.5, 0.0, 9.0, 1.0, 1.9, 0.32, -0.26, 0.1, 0.44,
    ];
    const uArr = new Float32Array(P);

    const E = [0.2, 0.82, 0.42, 0.03, 0.07, 0.35, 0.85, 1.6];
    const eArr = new Float32Array(E);

    let hover = 0.85,
      hoverTarget = 0.85,
      clock = 0,
      last = performance.now();
    const RIP = [0, 1, 2].map(() => ({ x: 0, y: 0, t: -99, on: 0 }));
    const ripArr = new Float32Array(12);
    let ripNext = 0,
      press = 0,
      pressTarget = 0;

    const ptr = { x: 0, y: 0 },
      ptrS = { x: 0, y: 0 };
    let ptrAmt = 0,
      ptrSpeed = 0;

    const addRipple = (x: number, y: number) => {
      const r = RIP[ripNext];
      ripNext = (ripNext + 1) % RIP.length;
      r.x = x;
      r.y = y;
      r.t = clock;
      r.on = 1;
    };

    const localPt = (e: PointerEvent) => {
      const b = container.getBoundingClientRect();
      const s = b.height;
      return [
        (e.clientX - (b.left + b.width / 2)) / s,
        (e.clientY - (b.top + b.height / 2)) / s,
      ];
    };

    const onEnter = (e: PointerEvent) => {
      const [x, y] = localPt(e);
      ptr.x = x;
      ptr.y = y;
      ptrS.x = x;
      ptrS.y = y;
      ptrSpeed = 0;
      hoverTarget = 1.65;
    };
    const onLeave = () => {
      hoverTarget = 0.85;
      pressTarget = 0;
    };
    const onMove = (e: PointerEvent) => {
      const [x, y] = localPt(e);
      ptr.x = x;
      ptr.y = y;
    };
    const onDown = (e: PointerEvent) => {
      const [x, y] = localPt(e);
      pressTarget = 1;
      addRipple(x, y);
    };
    const onUp = () => {
      pressTarget = 0;
    };

    container.addEventListener("pointerenter", onEnter);
    container.addEventListener("pointerleave", onLeave);
    container.addEventListener("pointermove", onMove);
    container.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    let animId = 0;
    const frame = (now: number) => {
      const dtRaw = (now - last) / 1000;
      last = now;
      const dt = Math.min(dtRaw, 1 / 20);
      clock += dt;

      const k =
        hoverTarget > hover
          ? 1 - Math.pow(0.0012, dt)
          : 1 - Math.pow(0.00012, dt);
      hover += (hoverTarget - hover) * k;

      const pk =
        pressTarget > press ? 1 - Math.pow(1e-9, dt) : 1 - Math.pow(0.004, dt);
      press += (pressTarget - press) * pk;

      for (let i = 0; i < RIP.length; i++) {
        const r = RIP[i];
        if (r.on && clock - r.t > 4) r.on = 0;
        ripArr[i * 4] = r.x;
        ripArr[i * 4 + 1] = r.y;
        ripArr[i * 4 + 2] = r.t;
        ripArr[i * 4 + 3] = r.on;
      }

      const lag = 1 - Math.pow(0.0016, dt);
      const dx = (ptr.x - ptrS.x) * lag;
      const dy = (ptr.y - ptrS.y) * lag;
      ptrS.x += dx;
      ptrS.y += dy;
      const inst = Math.min(Math.hypot(dx, dy) / Math.max(dt, 1e-3) / 4.5, 1);
      ptrSpeed +=
        (inst - ptrSpeed) * (1 - Math.pow(inst > ptrSpeed ? 0.001 : 0.02, dt));
      const wantWell = hoverTarget > 0 || pressTarget > 0 ? 1 : 0;
      ptrAmt += (wantWell - ptrAmt) * (1 - Math.pow(0.004, dt));

      const bw = Math.max(1.5, 3.2 * (BH / 516));

      // 1. Scene Pass
      gl.useProgram(pScene.p);
      gl.uniform2f(pScene.u.uC, CX, CY);
      gl.uniform2f(pScene.u.uHalf, BW / 2, BH / 2);
      gl.uniform1f(pScene.u.uT, clock);
      gl.uniform1f(pScene.u.uHover, hover);
      gl.uniform1f(pScene.u.uPress, press);
      gl.uniform4fv(pScene.u.uRip, ripArr);
      gl.uniform4f(pScene.u.uRipK, 1.85, 0.2, 1.35, 1.35);
      gl.uniform4f(pScene.u.uRipK2, 0.18, 6.0, 1.15, 0.45);
      gl.uniform4f(pScene.u.uPtr, ptrS.x, ptrS.y, ptrAmt, ptrSpeed);
      gl.uniform4f(pScene.u.uPtrK, 0.55, 0.32, 0.4, 0.8);
      gl.uniform1fv(pScene.u.uP, uArr);
      drawTo(T_core);

      // 2. Rim Pass
      gl.useProgram(pRim.p);
      gl.uniform2f(pRim.u.uC, CX, CY);
      gl.uniform2f(pRim.u.uHalf, BW / 2, BH / 2);
      gl.uniform1f(pRim.u.uT, clock);
      gl.uniform1f(pRim.u.uBw, bw);
      gl.uniform1f(pRim.u.uPress, press);
      gl.uniform4fv(pRim.u.uRip, ripArr);
      gl.uniform4f(pRim.u.uRipK, 1.85, 0.2, 1.35, 1.35);
      gl.uniform4f(pRim.u.uRipK2, 0.18, 6.0, 1.15, 0.45);
      gl.uniform4f(pRim.u.uPtr, ptrS.x, ptrS.y, ptrAmt, ptrSpeed);
      gl.uniform4f(pRim.u.uPtrK, 0.55, 0.32, 0.4, 0.8);
      gl.uniform1fv(pRim.u.uE, eArr);
      drawTo(T_rim);

      // 3. Softening Pass (Downsample + Separable Gaussian)
      gl.useProgram(pDown.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, T_core.tex);
      gl.uniform1i(pDown.u.uTex, 0);
      gl.uniform1f(pDown.u.uAdd, 0);
      gl.uniform2f(pDown.u.uDstTexel, 1 / T_s1.w, 1 / T_s1.h);
      gl.uniform2f(pDown.u.uSrcTexel, 1 / W, 1 / H);
      drawTo(T_s1);

      gl.useProgram(pBlur.p);
      gl.uniform1i(pBlur.u.uTex, 0);
      gl.uniform2f(pBlur.u.uTexel, 1 / T_s1.w, 1 / T_s1.h);
      const sigTex = 0.24 * (BH * 0.5) * 0.95;
      if (sigTex > 0.1) {
        const iters = Math.min(4, Math.max(1, Math.ceil(sigTex / 3.0)));
        gl.uniform1f(pBlur.u.uR, sigTex / Math.sqrt(iters) / 1.95);
        for (let i = 0; i < iters; i++) {
          gl.bindTexture(gl.TEXTURE_2D, T_s1.tex);
          gl.uniform2f(pBlur.u.uDir, 1, 0);
          drawTo(T_s2);
          gl.bindTexture(gl.TEXTURE_2D, T_s2.tex);
          gl.uniform2f(pBlur.u.uDir, 0, 1);
          drawTo(T_s1);
        }
      }

      // 4. Bloom Pass
      gl.useProgram(pDown.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, T_s1.tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, T_rim.tex);
      gl.uniform1i(pDown.u.uTex, 0);
      gl.uniform1i(pDown.u.uTex2, 1);
      gl.uniform1f(pDown.u.uAdd, 1);
      gl.uniform2f(pDown.u.uDstTexel, 1 / T_a.w, 1 / T_a.h);
      gl.uniform2f(pDown.u.uSrcTexel, 1 / T_s1.w, 1 / T_s1.h);
      drawTo(T_a);

      gl.useProgram(pBlur.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(pBlur.u.uTex, 0);
      gl.uniform2f(pBlur.u.uTexel, 1 / T_a.w, 1 / T_a.h);
      const rs = (1.3 * (BH / DOWN)) / GLOW_TEX;
      for (const r of [1.0, 2.3, 5.2, 9.0].map((v) => v * rs)) {
        gl.uniform1f(pBlur.u.uR, r);
        gl.bindTexture(gl.TEXTURE_2D, T_a.tex);
        gl.uniform2f(pBlur.u.uDir, 1, 0);
        drawTo(T_b);
        gl.bindTexture(gl.TEXTURE_2D, T_b.tex);
        gl.uniform2f(pBlur.u.uDir, 0, 1);
        drawTo(T_a);
      }

      // 5. Final Composite Pass
      gl.useProgram(pComp.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, T_s1.tex);
      gl.uniform1i(pComp.u.uSoft, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, T_rim.tex);
      gl.uniform1i(pComp.u.uRim, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, T_a.tex);
      gl.uniform1i(pComp.u.uGlow, 2);
      gl.uniform2f(pComp.u.uRes, W, H);
      gl.uniform2f(pComp.u.uC, CX, CY);
      gl.uniform2f(pComp.u.uHalf, BW / 2, BH / 2);
      gl.uniform1f(pComp.u.uT, clock);
      gl.uniform4fv(pComp.u.uRip, ripArr);
      gl.uniform4f(pComp.u.uRipK, 1.85, 0.2, 1.35, 1.35);
      gl.uniform4f(pComp.u.uRipK2, 0.18, 6.0, 1.15, 0.45);
      gl.uniform1f(pComp.u.uGlowGain, 1.95);
      gl.uniform1f(pComp.u.uGlowIn, 0.3);
      gl.uniform1f(pComp.u.uOccl, 0.62);
      gl.uniform1f(pComp.u.uDim, 0.44);
      gl.uniform1f(pComp.u.uPunch, 1.5);
      drawTo(null);

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      container.removeEventListener("pointerenter", onEnter);
      container.removeEventListener("pointerleave", onLeave);
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <a
      href={href}
      ref={containerRef}
      className={`group rim-light relative overflow-hidden flex items-center justify-between gap-3 mb-4 px-4 py-3.5 md:px-5 md:py-4 rounded-xl bg-[#0c0608] shadow-lg shadow-black/50 transition-[transform,box-shadow] duration-200 active:scale-[0.99] select-none ${className}`}
      style={
        {
          width: "100%",
          // rim light 的描邊與外暈改用品牌紅，而不是 Google 按鈕那組藍
          "--rim-line": "rgba(255, 214, 214, 0.85)",
          "--rim-glow": "rgba(220, 38, 38, 0.55)",
          // 對應 className 上的 shadow-lg shadow-black/50，hover 時才不會掉陰影
          "--rim-base-shadow":
            "0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -4px rgba(0,0,0,0.5)",
        } as React.CSSProperties
      }
    >
      {/* 5-Pass Molten Liquid Metal WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none rounded-xl"
        style={{ clipPath: "inset(0 round 0.75rem)" }}
      />

      {/* Foreground Content */}
      <div className="relative z-10 flex items-center gap-3.5 min-w-0 pointer-events-none">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white shrink-0 drop-shadow-md"
          aria-hidden="true"
        >
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
              Match Center
            </span>
            {runningCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white shrink-0">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
                {runningCount} LIVE
              </span>
            )}
          </div>
          <h2 className="mt-0.5 text-xl md:text-2xl font-serif font-black text-white tracking-tight drop-shadow-md">
            賽事資訊
          </h2>
        </div>
      </div>

      <span className="relative z-10 shrink-0 text-[11px] font-bold tracking-wider text-white inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 shadow-sm group-hover:bg-white/20 group-hover:border-white/40 transition-colors pointer-events-none">
        查看全部
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white transition-transform duration-300 group-hover:translate-x-0.5"
          aria-hidden="true"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </span>
    </a>
  );
}

export default LiquidMetalButton;
