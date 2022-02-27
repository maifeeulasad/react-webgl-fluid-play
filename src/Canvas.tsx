import React, { useEffect, useRef } from "react";

//resizeCanvas();

let config = {
  SIM_RESOLUTION: 256,
  DYE_RESOLUTION: 1024,
  CAPTURE_RESOLUTION: 512,
  DENSITY_DISSIPATION: 2,
  VELOCITY_DISSIPATION: 3.01,
  PRESSURE: 0.05,
  PRESSURE_ITERATIONS: 20,
  CURL: 30,
  SPLAT_RADIUS: 0.2,
  SPLAT_FORCE: 6000,
  SHADING: true,
  COLORFUL: false,
  COLOR_UPDATE_SPEED: 10,
  BACK_COLOR: { r: 0, g: 0, b: 0 },
  TRANSPARENT: false,
  BLOOM: true,
  BLOOM_ITERATIONS: 8,
  BLOOM_RESOLUTION: 256,
  BLOOM_INTENSITY: 0.8,
  BLOOM_THRESHOLD: 0.6,
  BLOOM_SOFT_KNEE: 0.7,
  SUNRAYS: true,
  SUNRAYS_RESOLUTION: 196,
  SUNRAYS_WEIGHT: 1.0,
};

//updateKeywords();
//initFramebuffers();

let lastUpdateTime = Date.now();
let colorUpdateTimer = 0.0;
//update();

interface Props {
  height?: number;
  width?: number;
}

const Canvas = ({ height, width }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  let id;
  let texcoordX, texcoordY;
  let prevTexcoordX, prevTexcoordY;
  let deltaX, deltaY;
  let down, moved;
  let color;

  const pointerPrototype = () => {
    id = -1;
    texcoordX = 0;
    texcoordY = 0;
    prevTexcoordX = 0;
    prevTexcoordY = 0;
    deltaX = 0;
    deltaY = 0;
    down = false;
    moved = false;
    color = [30, 0, 300];
  };

  const initEventListener = () => {
    canvasRef.current!.addEventListener(
      "mouseenter",
      (e: { offsetX: any; offsetY: any }) => {
        let posX = scaleByPixelRatio(e.offsetX);
        let posY = scaleByPixelRatio(e.offsetY);
        let pointer = pointers.find((p) => p.id === -1);
        if (pointer === null) pointer = pointerPrototype();
        updatePointerDownData(pointer, -1, posX, posY);
      }
    );

    canvasRef.current!.addEventListener(
      "mousedown",
      (e: { offsetX: any; offsetY: any }) => {
        let posX = scaleByPixelRatio(e.offsetX);
        let posY = scaleByPixelRatio(e.offsetY);
        let pointer = pointers.find((p) => p.id === -1);
        if (pointer === null) pointer = pointerPrototype();
        updatePointerDownData(pointer, -1, posX, posY);
      }
    );

    canvasRef.current!.addEventListener(
      "mousemove",
      (e: { offsetX: any; offsetY: any }) => {
        let pointer = pointers[0];
        if (!pointer.down) return;
        let posX = scaleByPixelRatio(e.offsetX);
        let posY = scaleByPixelRatio(e.offsetY);
        updatePointerMoveData(pointer, posX, posY);
      }
    );

    canvasRef.current!.addEventListener(
      "touchstart",
      (e: { preventDefault: () => void; targetTouches: any }) => {
        e.preventDefault();
        const touches = e.targetTouches;
        while (touches.length >= pointers.length)
          pointers.push(pointerPrototype());
        for (let i = 0; i < touches.length; i++) {
          let posX = scaleByPixelRatio(touches[i].pageX);
          let posY = scaleByPixelRatio(touches[i].pageY);
          updatePointerDownData(
            pointers[i + 1],
            touches[i].identifier,
            posX,
            posY
          );
        }
      }
    );

    canvasRef.current!.addEventListener(
      "touchmove",
      (e: { preventDefault: () => void; targetTouches: any }) => {
        e.preventDefault();
        const touches = e.targetTouches;
        for (let i = 0; i < touches.length; i++) {
          let pointer = pointers[i + 1];
          if (!pointer.down) continue;
          let posX = scaleByPixelRatio(touches[i].pageX);
          let posY = scaleByPixelRatio(touches[i].pageY);
          updatePointerMoveData(pointer, posX, posY);
        }
      },
      false
    );
  };

  useEffect(() => {
    if (canvasRef.current) {
      initEventListener();
    }
  }, [canvasRef]);

  window.addEventListener("onmouseleave", () => {
    updatePointerUpData(pointers[0]);
  });

  window.addEventListener("onmouseup", () => {
    updatePointerUpData(pointers[0]);
  });

  window.addEventListener("touchend", (e) => {
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
      let pointer = pointers.find((p) => p.id === touches[i].identifier);
      if (pointer === null) continue;
      updatePointerUpData(pointer);
    }
  });

  let pointers: any[] = [];
  let splatStack = [];
  pointers.push(pointerPrototype());

  const getWebGLContext = (canvas: {
    getContext: (
      arg0: string,
      arg1: {
        alpha: boolean;
        depth: boolean;
        stencil: boolean;
        antialias: boolean;
        preserveDrawingBuffer: boolean;
      }
    ) => any;
  }) => {
    const params = {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
    };

    let gl = canvas.getContext("webgl2", params);
    const isWebGL2 = !!gl;
    if (!isWebGL2)
      gl =
        canvas.getContext("webgl", params) ||
        canvas.getContext("experimental-webgl", params);

    let halfFloat;
    let supportLinearFiltering;
    if (isWebGL2) {
      gl.getExtension("EXT_color_buffer_float");
      supportLinearFiltering = gl.getExtension("OES_texture_float_linear");
    } else {
      halfFloat = gl.getExtension("OES_texture_half_float");
      supportLinearFiltering = gl.getExtension("OES_texture_half_float_linear");
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    const halfFloatTexType = isWebGL2
      ? gl.HALF_FLOAT
      : halfFloat.HALF_FLOAT_OES;
    let formatRGBA;
    let formatRG;
    let formatR;

    if (isWebGL2) {
      formatRGBA = getSupportedFormat(
        gl,
        gl.RGBA16F,
        gl.RGBA,
        halfFloatTexType
      );
      formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
      formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
    } else {
      formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    }

    return {
      gl,
      ext: {
        formatRGBA,
        formatRG,
        formatR,
        halfFloatTexType,
        supportLinearFiltering,
      },
    };
  };

  const { gl, ext } = getWebGLContext(canvasRef.current!);

  const isMobile = () => {
    return /Mobi|Android/i.test(navigator.userAgent);
  };

  if (isMobile()) {
    config.DYE_RESOLUTION = 512;
  }
  if (!ext.supportLinearFiltering) {
    config.DYE_RESOLUTION = 512;
    config.SHADING = false;
    config.BLOOM = false;
    config.SUNRAYS = false;
  }

  const getSupportedFormat = (
    gl: { R16F: any; RG16F: any; RG: any; RGBA16F: any; RGBA: any },
    internalFormat: any,
    format: any,
    type: any
  ): any => {
    // @ts-ignore
    if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
      switch (internalFormat) {
        case gl.R16F:
          return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
        case gl.RG16F:
          return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
        default:
          return null;
      }
    }

    return {
      internalFormat,
      format,
    };
  };

  const supportRenderTextureFormat = (
    gl: {
      createTexture: () => any;
      bindTexture: (arg0: any, arg1: any) => void;
      TEXTURE_2D: any;
      texParameteri: (arg0: any, arg1: any, arg2: any) => void;
      TEXTURE_MIN_FILTER: any;
      NEAREST: any;
      TEXTURE_MAG_FILTER: any;
      TEXTURE_WRAP_S: any;
      CLAMP_TO_EDGE: any;
      TEXTURE_WRAP_T: any;
      texImage2D: (
        arg0: any,
        arg1: number,
        arg2: any,
        arg3: number,
        arg4: number,
        arg5: number,
        arg6: any,
        arg7: any,
        arg8: null
      ) => void;
      createFramebuffer: () => any;
      bindFramebuffer: (arg0: any, arg1: any) => void;
      FRAMEBUFFER: any;
      framebufferTexture2D: (
        arg0: any,
        arg1: any,
        arg2: any,
        arg3: any,
        arg4: number
      ) => void;
      COLOR_ATTACHMENT0: any;
      checkFramebufferStatus: (arg0: any) => any;
      FRAMEBUFFER_COMPLETE: any;
    },
    internalFormat: any,
    format: any,
    type: any
  ) => {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      4,
      4,
      0,
      format,
      type,
      null
    );

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );

    let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    return status === gl.FRAMEBUFFER_COMPLETE;
  };

  class Material {
    vertexShader: any;
    fragmentShaderSource: string;
    programs: any[];
    activeProgram: null;
    uniforms: any[];
    constructor(vertexShader: any, fragmentShaderSource: string) {
      this.vertexShader = vertexShader;
      this.fragmentShaderSource = fragmentShaderSource;
      this.programs = [];
      this.activeProgram = null;
      this.uniforms = [];
    }

    setKeywords(keywords: string[] | any[]) {
      let hash = 0;
      for (let i = 0; i < keywords.length; i++) hash += hashCode(keywords[i]);

      let program = this.programs[hash];
      if (program === null) {
        let fragmentShader = compileShader(
          gl.FRAGMENT_SHADER,
          this.fragmentShaderSource,
          keywords
        );
        program = createProgram(this.vertexShader, fragmentShader);
        this.programs[hash] = program;
      }

      if (program === this.activeProgram) return;

      this.uniforms = getUniforms(program);
      this.activeProgram = program;
    }

    bind() {
      gl.useProgram(this.activeProgram);
    }
  }

  class Program {
    uniforms: {};
    program: any;
    constructor(vertexShader: any, fragmentShader: any) {
      this.uniforms = {};
      this.program = createProgram(vertexShader, fragmentShader);
      this.uniforms = getUniforms(this.program);
    }

    bind() {
      gl.useProgram(this.program);
    }
  }

  const createProgram = (vertexShader: any, fragmentShader: any) => {
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      console.trace(gl.getProgramInfoLog(program));

    return program;
  };

  const getUniforms = (program: any) => {
    let uniforms = [];
    let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      let uniformName = gl.getActiveUniform(program, i).name;
      uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
    }
    return uniforms;
  };

  const compileShader = (type: any, source: string, keywords?: string[]) => {
    source = addKeywords(source, keywords);

    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      console.trace(gl.getShaderInfoLog(shader));

    return shader;
  };

  const addKeywords = (source: string, keywords: string[] | undefined) => {
    if (keywords === null) return source;
    let keywordsString = "";
    if (keywords) {
      keywords.forEach((keyword: string) => {
        keywordsString += "#define " + keyword + "\n";
      });
    }
    return keywordsString + source;
  };

  const baseVertexShader = compileShader(
    gl.VERTEX_SHADER,
    `
        precision highp float;
    
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;
    
        void main () {
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `
  );

  const blurVertexShader = compileShader(
    gl.VERTEX_SHADER,
    `
        precision highp float;
    
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        uniform vec2 texelSize;
    
        void main () {
            vUv = aPosition * 0.5 + 0.5;
            float offset = 1.33333333;
            vL = vUv - texelSize * offset;
            vR = vUv + texelSize * offset;
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `
  );

  const blurShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
    
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        uniform sampler2D uTexture;
    
        void main () {
            vec4 sum = texture2D(uTexture, vUv) * 0.29411764;
            sum += texture2D(uTexture, vL) * 0.35294117;
            sum += texture2D(uTexture, vR) * 0.35294117;
            gl_FragColor = sum;
        }
    `
  );

  const copyShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
    
        varying highp vec2 vUv;
        uniform sampler2D uTexture;
    
        void main () {
            gl_FragColor = texture2D(uTexture, vUv);
        }
    `
  );

  const clearShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
    
        varying highp vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;
    
        void main () {
            gl_FragColor = value * texture2D(uTexture, vUv);
        }
    `
  );

  const colorShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
    
        uniform vec4 color;
    
        void main () {
            gl_FragColor = color;
        }
    `
  );

  const checkerboardShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision highp float;
        precision highp sampler2D;
    
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform float aspectRatio;
    
        #define SCALE 25.0
    
        void main () {
            vec2 uv = floor(vUv * SCALE * vec2(aspectRatio, 1.0));
            float v = mod(uv.x + uv.y, 2.0);
            v = v * 0.1 + 0.8;
            gl_FragColor = vec4(vec3(v), 1.0);
        }
    `
  );

  const displayShaderSource = `
        precision highp float;
        precision highp sampler2D;
    
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uTexture;
        uniform sampler2D uBloom;
        uniform sampler2D uSunrays;
        uniform sampler2D uDithering;
        uniform vec2 ditherScale;
        uniform vec2 texelSize;
    
        vec3 linearToGamma (vec3 color) {
            color = max(color, vec3(0));
            return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
        }
    
        void main () {
            vec3 c = texture2D(uTexture, vUv).rgb;
    
        #ifdef SHADING
            vec3 lc = texture2D(uTexture, vL).rgb;
            vec3 rc = texture2D(uTexture, vR).rgb;
            vec3 tc = texture2D(uTexture, vT).rgb;
            vec3 bc = texture2D(uTexture, vB).rgb;
    
            float dx = length(rc) - length(lc);
            float dy = length(tc) - length(bc);
    
            vec3 n = normalize(vec3(dx, dy, length(texelSize)));
            vec3 l = vec3(0.0, 0.0, 1.0);
    
            float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
            c *= diffuse;
        #endif
    
        #ifdef BLOOM
            vec3 bloom = texture2D(uBloom, vUv).rgb;
        #endif
    
        #ifdef SUNRAYS
            float sunrays = texture2D(uSunrays, vUv).r;
            c *= sunrays;
        #ifdef BLOOM
            bloom *= sunrays;
        #endif
        #endif
    
        #ifdef BLOOM
            float noise = texture2D(uDithering, vUv * ditherScale).r;
            noise = noise * 2.0 - 1.0;
            bloom += noise / 255.0;
            bloom = linearToGamma(bloom);
            c += bloom;
        #endif
    
            float a = max(c.r, max(c.g, c.b));
            gl_FragColor = vec4(c, a);
        }
    `;

  const bloomPrefilterShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
    
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform vec3 curve;
        uniform float threshold;
    
        void main () {
            vec3 c = texture2D(uTexture, vUv).rgb;
            float br = max(c.r, max(c.g, c.b));
            float rq = clamp(br - curve.x, 0.0, curve.y);
            rq = curve.z * rq * rq;
            c *= max(rq, br - threshold) / max(br, 0.0001);
            gl_FragColor = vec4(c, 0.0);
        }
    `
  );

  const bloomBlurShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
    
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uTexture;
    
        void main () {
            vec4 sum = vec4(0.0);
            sum += texture2D(uTexture, vL);
            sum += texture2D(uTexture, vR);
            sum += texture2D(uTexture, vT);
            sum += texture2D(uTexture, vB);
            sum *= 0.25;
            gl_FragColor = sum;
        }
    `
  );

  const bloomFinalShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
    
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uTexture;
        uniform float intensity;
    
        void main () {
            vec4 sum = vec4(0.0);
            sum += texture2D(uTexture, vL);
            sum += texture2D(uTexture, vR);
            sum += texture2D(uTexture, vT);
            sum += texture2D(uTexture, vB);
            sum *= 0.25;
            gl_FragColor = sum * intensity;
        }
    `
  );

  const sunraysMaskShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision highp float;
        precision highp sampler2D;
    
        varying vec2 vUv;
        uniform sampler2D uTexture;
    
        void main () {
            vec4 c = texture2D(uTexture, vUv);
            float br = max(c.r, max(c.g, c.b));
            c.a = 1.0 - min(max(br * 20.0, 0.0), 0.8);
            gl_FragColor = c;
        }
    `
  );

  const sunraysShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision highp float;
        precision highp sampler2D;
    
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform float weight;
    
        #define ITERATIONS 16
    
        void main () {
            float Density = 0.3;
            float Decay = 0.95;
            float Exposure = 0.7;
    
            vec2 coord = vUv;
            vec2 dir = vUv - 0.5;
    
            dir *= 1.0 / float(ITERATIONS) * Density;
            float illuminationDecay = 1.0;
    
            float color = texture2D(uTexture, vUv).a;
    
            for (int i = 0; i < ITERATIONS; i++)
            {
                coord -= dir;
                float col = texture2D(uTexture, coord).a;
                color += col * illuminationDecay * weight;
                illuminationDecay *= Decay;
            }
    
            gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);
        }
    `
  );

  const splatShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision highp float;
        precision highp sampler2D;
    
        varying vec2 vUv;
        uniform sampler2D uTarget;
        uniform float aspectRatio;
        uniform vec3 color;
        uniform vec2 point;
        uniform float radius;
    
        void main () {
            vec2 p = vUv - point.xy;
            p.x *= aspectRatio;
            vec3 splat = exp(-dot(p, p) / radius) * color;
            vec3 base = texture2D(uTarget, vUv).xyz;
            gl_FragColor = vec4(base + splat, 1.0);
        }
    `
  );

  const advectionShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision highp float;
        precision highp sampler2D;
    
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform vec2 dyeTexelSize;
        uniform float dt;
        uniform float dissipation;
    
        vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
            vec2 st = uv / tsize - 0.5;
    
            vec2 iuv = floor(st);
            vec2 fuv = fract(st);
    
            vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
            vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
            vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
            vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
    
            return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
        }
    
        void main () {
        #ifdef MANUAL_FILTERING
            vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
            vec4 result = bilerp(uSource, coord, dyeTexelSize);
        #else
            vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
            vec4 result = texture2D(uSource, coord);
        #endif
            float decay = 1.0 + dissipation * dt;
            gl_FragColor = result / decay;
        }`,
    ext.supportLinearFiltering ? undefined : ["MANUAL_FILTERING"]
  );

  const divergenceShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
    
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;
    
        void main () {
            float L = texture2D(uVelocity, vL).x;
            float R = texture2D(uVelocity, vR).x;
            float T = texture2D(uVelocity, vT).y;
            float B = texture2D(uVelocity, vB).y;
    
            vec2 C = texture2D(uVelocity, vUv).xy;
            if (vL.x < 0.0) { L = -C.x; }
            if (vR.x > 1.0) { R = -C.x; }
            if (vT.y > 1.0) { T = -C.y; }
            if (vB.y < 0.0) { B = -C.y; }
    
            float div = 0.5 * (R - L + T - B);
            gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
    `
  );

  const curlShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
    
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;
    
        void main () {
            float L = texture2D(uVelocity, vL).y;
            float R = texture2D(uVelocity, vR).y;
            float T = texture2D(uVelocity, vT).x;
            float B = texture2D(uVelocity, vB).x;
            float vorticity = R - L - T + B;
            gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
        }
    `
  );

  const vorticityShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision highp float;
        precision highp sampler2D;
    
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        uniform sampler2D uCurl;
        uniform float curl;
        uniform float dt;
    
        void main () {
            float L = texture2D(uCurl, vL).x;
            float R = texture2D(uCurl, vR).x;
            float T = texture2D(uCurl, vT).x;
            float B = texture2D(uCurl, vB).x;
            float C = texture2D(uCurl, vUv).x;
    
            vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
            force /= length(force) + 0.0001;
            force *= curl * C;
            force.y *= -1.0;
    
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity += force * dt;
            velocity = min(max(velocity, -1000.0), 1000.0);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
    `
  );

  const pressureShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
    
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;
    
        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            float C = texture2D(uPressure, vUv).x;
            float divergence = texture2D(uDivergence, vUv).x;
            float pressure = (L + R + B + T - divergence) * 0.25;
            gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
    `
  );

  const gradientSubtractShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
    
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;
    
        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity.xy -= vec2(R - L, T - B);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
    `
  );

  const blit = (() => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
      gl.STATIC_DRAW
    );
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    return (
      target: { width: any; height: any; fbo: any } | null,
      clear = false
    ) => {
      if (target === null) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      }
      if (clear) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      // CHECK_FRAMEBUFFER_STATUS();
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
  })();

  const CHECK_FRAMEBUFFER_STATUS = () => {
    let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE)
      console.trace("Framebuffer error: " + status);
  };

  let dye: {
    texelSizeX: any;
    texelSizeY: any;
    read: any;
    write: any;
    swap: any;
    width?: any;
    height?: any;
  } | null;
  let velocity: {
    texelSizeX: any;
    texelSizeY: any;
    read: any;
    write: any;
    swap: any;
    width?: any;
    height?: any;
  } | null;
  let divergence: {
    attach: any;
    texture?: any;
    fbo?: any;
    width?: any;
    height?: any;
    texelSizeX?: number;
    texelSizeY?: number;
  };
  let curl: {
    attach: any;
    texture?: any;
    fbo?: any;
    width?: any;
    height?: any;
    texelSizeX?: number;
    texelSizeY?: number;
  };
  let pressure: {
    read: any;
    write: any;
    swap: any;
    width?: any;
    height?: any;
    texelSizeX?: number;
    texelSizeY?: number;
  };
  let bloom: {
    attach: any;
    texture?: any;
    fbo?: any;
    width?: any;
    height?: any;
    texelSizeX?: number;
    texelSizeY?: number;
  };
  let bloomFramebuffers: any[] = [];
  let sunrays: {
    attach: any;
    texture?: any;
    fbo?: any;
    width?: any;
    height?: any;
    texelSizeX?: number;
    texelSizeY?: number;
  };
  let sunraysTemp: {
    texture: any;
    fbo: any;
    width: any;
    height: any;
    texelSizeX: number;
    texelSizeY: number;
    attach(id: any): any;
  };

  const createTextureAsync = (url: string) => {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGB,
      1,
      1,
      0,
      gl.RGB,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255])
    );

    let obj = {
      texture,
      width: 1,
      height: 1,
      attach(id: number) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };

    let image = new Image();
    image.onload = () => {
      obj.width = image.width;
      obj.height = image.height;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    };
    image.src = url;

    return obj;
  };

  let ditheringTexture = createTextureAsync("LDR_LLL1_0.png");

  const blurProgram = new Program(blurVertexShader, blurShader);
  const copyProgram = new Program(baseVertexShader, copyShader);
  const clearProgram = new Program(baseVertexShader, clearShader);
  const colorProgram = new Program(baseVertexShader, colorShader);
  const checkerboardProgram = new Program(baseVertexShader, checkerboardShader);
  const bloomPrefilterProgram = new Program(
    baseVertexShader,
    bloomPrefilterShader
  );
  const bloomBlurProgram = new Program(baseVertexShader, bloomBlurShader);
  const bloomFinalProgram = new Program(baseVertexShader, bloomFinalShader);
  const sunraysMaskProgram = new Program(baseVertexShader, sunraysMaskShader);
  const sunraysProgram = new Program(baseVertexShader, sunraysShader);
  const splatProgram = new Program(baseVertexShader, splatShader);
  const advectionProgram = new Program(baseVertexShader, advectionShader);
  const divergenceProgram = new Program(baseVertexShader, divergenceShader);
  const curlProgram = new Program(baseVertexShader, curlShader);
  const vorticityProgram = new Program(baseVertexShader, vorticityShader);
  const pressureProgram = new Program(baseVertexShader, pressureShader);
  const gradienSubtractProgram = new Program(
    baseVertexShader,
    gradientSubtractShader
  );

  const displayMaterial = new Material(baseVertexShader, displayShaderSource);

  const initFramebuffers = () => {
    let simRes = getResolution(config.SIM_RESOLUTION);
    let dyeRes = getResolution(config.DYE_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const rg = ext.formatRG;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    gl.disable(gl.BLEND);

    if (dye === null) {
      dye = createDoubleFBO(
        dyeRes.width,
        dyeRes.height,
        rgba.internalFormat,
        rgba.format,
        texType,
        filtering
      );
    } else {
      // @ts-ignore
      dye = resizeDoubleFBO(
        // @ts-ignore
        dye,
        dyeRes.width,
        dyeRes.height,
        rgba.internalFormat,
        rgba.format,
        texType,
        filtering
      );
    }

    if (velocity === null) {
      velocity = createDoubleFBO(
        simRes.width,
        simRes.height,
        rg.internalFormat,
        rg.format,
        texType,
        filtering
      );
    } else {
      // @ts-ignore

      velocity = resizeDoubleFBO(
      // @ts-ignore

        velocity,
        simRes.width,
        simRes.height,
        rg.internalFormat,
        rg.format,
        texType,
        filtering
      );
    }

    divergence = createFBO(
      simRes.width,
      simRes.height,
      r.internalFormat,
      r.format,
      texType,
      gl.NEAREST
    );
    curl = createFBO(
      simRes.width,
      simRes.height,
      r.internalFormat,
      r.format,
      texType,
      gl.NEAREST
    );
    pressure = createDoubleFBO(
      simRes.width,
      simRes.height,
      r.internalFormat,
      r.format,
      texType,
      gl.NEAREST
    );

    initBloomFramebuffers();
    initSunraysFramebuffers();
  };

  const initBloomFramebuffers = () => {
    let res = getResolution(config.BLOOM_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    bloom = createFBO(
      res.width,
      res.height,
      rgba.internalFormat,
      rgba.format,
      texType,
      filtering
    );

    bloomFramebuffers.length = 0;
    for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
      let width = res.width >> (i + 1);
      let height = res.height >> (i + 1);

      if (width < 2 || height < 2) break;

      let fbo = createFBO(
        width,
        height,
        rgba.internalFormat,
        rgba.format,
        texType,
        filtering
      );
      bloomFramebuffers.push(fbo);
    }
  };

  const initSunraysFramebuffers = () => {
    let res = getResolution(config.SUNRAYS_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    sunrays = createFBO(
      res.width,
      res.height,
      r.internalFormat,
      r.format,
      texType,
      filtering
    );
    sunraysTemp = createFBO(
      res.width,
      res.height,
      r.internalFormat,
      r.format,
      texType,
      filtering
    );
  };

  const createFBO = (
    w: number,
    h: number,
    internalFormat: any,
    format: any,
    type: any,
    param: any
  ) => {
    gl.activeTexture(gl.TEXTURE0);
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      w,
      h,
      0,
      format,
      type,
      null
    );

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let texelSizeX = 1.0 / w;
    let texelSizeY = 1.0 / h;

    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX,
      texelSizeY,
      attach(id: any) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  };

  const createDoubleFBO = (
    w: number,
    h: number,
    internalFormat: any,
    format: any,
    type: any,
    param: any
  ) => {
    let fbo1 = createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(w, h, internalFormat, format, type, param);

    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      get read() {
        return fbo1;
      },
      set read(value) {
        fbo1 = value;
      },
      get write() {
        return fbo2;
      },
      set write(value) {
        fbo2 = value;
      },
      swap() {
        let temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      },
    };
  };

  const resizeFBO = (
    target: { attach: (arg0: number) => any },
    w: any,
    h: any,
    internalFormat: any,
    format: any,
    type: any,
    param: any
  ) => {
    let newFBO = createFBO(w, h, internalFormat, format, type, param);
    copyProgram.bind();
    // @ts-ignore
    gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
    blit(newFBO);
    return newFBO;
  };

  const resizeDoubleFBO = (
    target: {
      width: any;
      height: any;
      read: {
        texture: any;
        fbo: any;
        width: any;
        height: any;
        texelSizeX: number;
        texelSizeY: number;
        attach(id: any): any;
      };
      write: {
        texture: any;
        fbo: any;
        width: any;
        height: any;
        texelSizeX: number;
        texelSizeY: number;
        attach(id: any): any;
      };
      texelSizeX: number;
      texelSizeY: number;
    },
    w: number,
    h: number,
    internalFormat: any,
    format: any,
    type: any,
    param: any
  ) => {
    if (target.width === w && target.height === h) return target;
    target.read = resizeFBO(
      target.read,
      w,
      h,
      internalFormat,
      format,
      type,
      param
    );
    target.write = createFBO(w, h, internalFormat, format, type, param);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1.0 / w;
    target.texelSizeY = 1.0 / h;
    return target;
  };

  const updateKeywords = () => {
    let displayKeywords = [];
    if (config.SHADING) displayKeywords.push("SHADING");
    if (config.BLOOM) displayKeywords.push("BLOOM");
    if (config.SUNRAYS) displayKeywords.push("SUNRAYS");
    displayMaterial.setKeywords(displayKeywords);
  };

  const update = () => {
    const dt = calcDeltaTime();
    if (resizeCanvas()) initFramebuffers();
    updateColors(dt);
    applyInputs();
    step(dt);
    render(null);
    requestAnimationFrame(update);
  };

  const calcDeltaTime = () => {
    let now = Date.now();
    let dt = (now - lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    lastUpdateTime = now;
    return dt;
  };

  const resizeCanvas = () => {
    let width = scaleByPixelRatio(canvasRef.current!.clientWidth);
    let height = scaleByPixelRatio(canvasRef.current!.clientHeight);
    if (
      canvasRef.current!.width !== width ||
      canvasRef.current!.height !== height
    ) {
      canvasRef.current!.width = width;
      canvasRef.current!.height = height;
      return true;
    }
    return false;
  };

  const updateColors = (dt: number) => {
    if (!config.COLORFUL) return;

    colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
    if (colorUpdateTimer >= 1) {
      colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
      pointers.forEach((p) => {
        p.color = generateColor();
      });
    }
  };

  const applyInputs = () => {
    pointers.forEach((p) => {
      if (p.moved) {
        p.moved = false;
        splatPointer(p);
      }
    });
  };

  const step = (dt: number) => {
    gl.disable(gl.BLEND);

    curlProgram.bind();
    gl.uniform2f(
    // @ts-ignore

      curlProgram.uniforms.texelSize,
    // @ts-ignore

      velocity.texelSizeX,
    // @ts-ignore

      velocity.texelSizeY
    );
    // @ts-ignore
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
    // @ts-ignore
    blit(curl);

    vorticityProgram.bind();
    gl.uniform2f(
    // @ts-ignore

      vorticityProgram.uniforms.texelSize,
    // @ts-ignore

      velocity.texelSizeX,
    // @ts-ignore

      velocity.texelSizeY
    );
    // @ts-ignore
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
    // @ts-ignore
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
    // @ts-ignore
    gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
    // @ts-ignore
    gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    // @ts-ignore
    blit(velocity.write);
    // @ts-ignore
    velocity.swap();

    divergenceProgram.bind();
    gl.uniform2f(
    // @ts-ignore

      divergenceProgram.uniforms.texelSize,
    // @ts-ignore

      velocity.texelSizeX,
    // @ts-ignore

      velocity.texelSizeY
    );
    // @ts-ignore
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
    // @ts-ignore
    blit(divergence);

    clearProgram.bind();
    // @ts-ignore
    gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
    // @ts-ignore
    gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
    blit(pressure.write);
    pressure.swap();

    pressureProgram.bind();
    gl.uniform2f(
    // @ts-ignore

      pressureProgram.uniforms.texelSize,
    // @ts-ignore

      velocity.texelSizeX,
    // @ts-ignore

      velocity.texelSizeY
    );
    // @ts-ignore
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      // @ts-ignore
      gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    gradienSubtractProgram.bind();
    gl.uniform2f(

    // @ts-ignore

      gradienSubtractProgram.uniforms.texelSize,
    // @ts-ignore

      velocity.texelSizeX,
    // @ts-ignore

      velocity.texelSizeY
    );
    gl.uniform1i(
    // @ts-ignore

      gradienSubtractProgram.uniforms.uPressure,
      pressure.read.attach(0)
    );
    gl.uniform1i(
    // @ts-ignore

      gradienSubtractProgram.uniforms.uVelocity,
    // @ts-ignore

      velocity.read.attach(1)
    );
    // @ts-ignore
    blit(velocity.write);
    // @ts-ignore
    velocity.swap();

    advectionProgram.bind();
    gl.uniform2f(
    // @ts-ignore

      advectionProgram.uniforms.texelSize,
    // @ts-ignore

      velocity.texelSizeX,
    // @ts-ignore

      velocity.texelSizeY
    );
    if (!ext.supportLinearFiltering) {
      gl.uniform2f(
      // @ts-ignore

        advectionProgram.uniforms.dyeTexelSize,
      // @ts-ignore

        velocity.texelSizeX,
      // @ts-ignore

        velocity.texelSizeY
      );
    }
    // @ts-ignore
    let velocityId = velocity.read.attach(0);
    // @ts-ignore
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
    // @ts-ignore
    gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
    // @ts-ignore
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(
    // @ts-ignore

      advectionProgram.uniforms.dissipation,
      config.VELOCITY_DISSIPATION
    );
    // @ts-ignore
    blit(velocity.write);
    // @ts-ignore
    velocity.swap();

    if (!ext.supportLinearFiltering) {
      gl.uniform2f(
      // @ts-ignore

        advectionProgram.uniforms.dyeTexelSize,
      // @ts-ignore

        dye.texelSizeX,
      // @ts-ignore

        dye.texelSizeY
      );
    }
    // @ts-ignore
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    // @ts-ignore
    gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
    gl.uniform1f(

    // @ts-ignore

      advectionProgram.uniforms.dissipation,
      config.DENSITY_DISSIPATION
    );
    // @ts-ignore
    blit(dye.write);
    // @ts-ignore
    dye.swap();
  };

  const render = (target: null) => {
    if (config.BLOOM) {
      // @ts-ignore
      applyBloom(dye.read, bloom);
    }
    if (config.SUNRAYS) {
      // @ts-ignore
      applySunrays(dye.read, dye.write, sunrays);
      // @ts-ignore
      blur(sunrays, sunraysTemp, 1);
    }

    if (target === null || !config.TRANSPARENT) {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
    } else {
      gl.disable(gl.BLEND);
    }

    if (!config.TRANSPARENT)
      drawColor(target, normalizeColor(config.BACK_COLOR));
    if (target === null && config.TRANSPARENT) drawCheckerboard(target);
    drawDisplay(target);
  };

  const drawColor = (target: any, color: { r: any; g: any; b: any }) => {
    colorProgram.bind();
    // @ts-ignore
    gl.uniform4f(colorProgram.uniforms.color, color.r, color.g, color.b, 1);
    blit(target);
  };

  const drawCheckerboard = (target: any) => {
    checkerboardProgram.bind();
    gl.uniform1f(
    // @ts-ignore

      checkerboardProgram.uniforms.aspectRatio,
      canvasRef.current!.width / canvasRef.current!.height
    );
    blit(target);
  };

  const drawDisplay = (target: { width: any; height: any } | null) => {
    let width = target === null ? gl.drawingBufferWidth : target.width;
    let height = target === null ? gl.drawingBufferHeight : target.height;

    displayMaterial.bind();
    if (config.SHADING) {
      gl.uniform2f(
      // @ts-ignore

        displayMaterial.uniforms.texelSize,
        1.0 / width,
        1.0 / height
      );
    }

    // @ts-ignore
    gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
    if (config.BLOOM) {
      // @ts-ignore
      gl.uniform1i(displayMaterial.uniforms.uBloom, bloom.attach(1));
      gl.uniform1i(
      // @ts-ignore

        displayMaterial.uniforms.uDithering,
        ditheringTexture.attach(2)
      );
      let scale = getTextureScale(ditheringTexture, width, height);
      // @ts-ignore
      gl.uniform2f(displayMaterial.uniforms.ditherScale, scale.x, scale.y);
    }
    if (config.SUNRAYS) {
      // @ts-ignore
      gl.uniform1i(displayMaterial.uniforms.uSunrays, sunrays.attach(3));
    }

    // @ts-ignore
    blit(target);
  };

  const applyBloom = (
    source: { attach: (arg0: number) => any },
    destination: any
  ) => {
    if (bloomFramebuffers.length < 2) return;

    let last = destination;

    gl.disable(gl.BLEND);
    bloomPrefilterProgram.bind();
    let knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
    let curve0 = config.BLOOM_THRESHOLD - knee;
    let curve1 = knee * 2;
    let curve2 = 0.25 / knee;
    // @ts-ignore
    gl.uniform3f(bloomPrefilterProgram.uniforms.curve, curve0, curve1, curve2);
    gl.uniform1f(
    // @ts-ignore

      bloomPrefilterProgram.uniforms.threshold,
      config.BLOOM_THRESHOLD
    );
    // @ts-ignore
    gl.uniform1i(bloomPrefilterProgram.uniforms.uTexture, source.attach(0));
    blit(last);

    bloomBlurProgram.bind();
    for (let i = 0; i < bloomFramebuffers.length; i++) {
      let dest = bloomFramebuffers[i];
      gl.uniform2f(
      // @ts-ignore

        bloomBlurProgram.uniforms.texelSize,
        last.texelSizeX,
        last.texelSizeY
      );
      // @ts-ignore
      gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
      blit(dest);
      last = dest;
    }

    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);

    for (let i = bloomFramebuffers.length - 2; i >= 0; i--) {
      let baseTex = bloomFramebuffers[i];
      gl.uniform2f(
      // @ts-ignore

        bloomBlurProgram.uniforms.texelSize,
        last.texelSizeX,
        last.texelSizeY
      );
      // @ts-ignore
      gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
      gl.viewport(0, 0, baseTex.width, baseTex.height);
      blit(baseTex);
      last = baseTex;
    }

    gl.disable(gl.BLEND);
    bloomFinalProgram.bind();
    gl.uniform2f(
    // @ts-ignore

      bloomFinalProgram.uniforms.texelSize,
      last.texelSizeX,
      last.texelSizeY
    );
    // @ts-ignore
    gl.uniform1i(bloomFinalProgram.uniforms.uTexture, last.attach(0));
    // @ts-ignore
    gl.uniform1f(bloomFinalProgram.uniforms.intensity, config.BLOOM_INTENSITY);
    blit(destination);
  };

  const applySunrays = (
    source: { attach: (arg0: number) => any },
    mask: { attach: (arg0: number) => any },
    destination: any
  ) => {
    gl.disable(gl.BLEND);
    sunraysMaskProgram.bind();
    // @ts-ignore
    gl.uniform1i(sunraysMaskProgram.uniforms.uTexture, source.attach(0));
    // @ts-ignore
    blit(mask);

    sunraysProgram.bind();
    // @ts-ignore
    gl.uniform1f(sunraysProgram.uniforms.weight, config.SUNRAYS_WEIGHT);
    // @ts-ignore
    gl.uniform1i(sunraysProgram.uniforms.uTexture, mask.attach(0));
    blit(destination);
  };

  const blur = (
    target: { texelSizeX: any; attach: (arg0: number) => any; texelSizeY: any },
    temp: { attach: (arg0: number) => any },
    iterations: number
  ) => {
    blurProgram.bind();
    for (let i = 0; i < iterations; i++) {
      // @ts-ignore
      gl.uniform2f(blurProgram.uniforms.texelSize, target.texelSizeX, 0.0);
      // @ts-ignore
      gl.uniform1i(blurProgram.uniforms.uTexture, target.attach(0));
      // @ts-ignore
      blit(temp);

      // @ts-ignore
      gl.uniform2f(blurProgram.uniforms.texelSize, 0.0, target.texelSizeY);
      // @ts-ignore
      gl.uniform1i(blurProgram.uniforms.uTexture, temp.attach(0));
      // @ts-ignore
      blit(target);
    }
  };

  const splatPointer = (pointer: {
    deltaX: number;
    deltaY: number;
    texcoordX: any;
    texcoordY: any;
    color: any;
  }) => {
    let dx = pointer.deltaX * config.SPLAT_FORCE;
    let dy = pointer.deltaY * config.SPLAT_FORCE;
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
  };

  const splat = (
    x: any,
    y: any,
    dx: number,
    dy: number,
    color: { r: any; g: any; b: any }
  ) => {
    splatProgram.bind();
    // @ts-ignore
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(
        // @ts-ignore
      splatProgram.uniforms.aspectRatio,
      // @ts-ignore
      canvas.width / canvas.height
    );
    // @ts-ignore
    gl.uniform2f(splatProgram.uniforms.point, x, y);
    // @ts-ignore
    gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
    gl.uniform1f(
    // @ts-ignore
      splatProgram.uniforms.radius,
      correctRadius(config.SPLAT_RADIUS / 100.0)
    );
    // @ts-ignore
    blit(velocity.write);
    // @ts-ignore
    velocity.swap();

    // @ts-ignore
    gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
    // @ts-ignore
    gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
    // @ts-ignore
    blit(dye.write);
    // @ts-ignore
    dye.swap();
  };

  const correctRadius = (radius: number) => {
    let aspectRatio = canvasRef.current!.width / canvasRef.current!.height;
    if (aspectRatio > 1) radius *= aspectRatio;
    return radius;
  };

  const updatePointerDownData = (
    pointer: {
      id: any;
      down: boolean;
      moved: boolean;
      texcoordX: number;
      texcoordY: number;
      prevTexcoordX: any;
      prevTexcoordY: any;
      deltaX: number;
      deltaY: number;
      color: { r: any; g: any; b: any };
    },
    id: number,
    posX: number,
    posY: number
  ) => {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / canvasRef.current!.width;
    pointer.texcoordY = 1.0 - posY / canvasRef.current!.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = generateColor();
  };

  const updatePointerMoveData = (
    pointer: {
      prevTexcoordX: number;
      texcoordX: number;
      prevTexcoordY: number;
      texcoordY: number;
      deltaX: number;
      deltaY: number;
      moved: boolean;
    },
    posX: number,
    posY: number
  ) => {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / canvasRef.current!.width;
    pointer.texcoordY = 1.0 - posY / canvasRef.current!.height;
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved =
      Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
  };

  const updatePointerUpData = (pointer: { down: boolean }) => {
    pointer.down = false;
  };

  const correctDeltaX = (delta: number) => {
    let aspectRatio = canvasRef.current!.width / canvasRef.current!.height;
    if (aspectRatio < 1) delta *= aspectRatio;
    return delta;
  };

  const correctDeltaY = (delta: number) => {
    let aspectRatio = canvasRef.current!.width / canvasRef.current!.height;
    if (aspectRatio > 1) delta /= aspectRatio;
    return delta;
  };

  const generateColor = () => {
    let c = HSVtoRGB(Math.random(), 1.0, 1.0);
    // @ts-ignore
    c.r *= 0.15;
    // @ts-ignore
    c.g *= 0.15;
    // @ts-ignore
    c.b *= 0.15;
    return c;
  };

  const HSVtoRGB = (h: number, s: number, v: number) => {
    let r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0:
        // eslint-disable-next-line no-unused-expressions
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        (r = v), (g = t), (b = p);
        break;
      case 1:
        // eslint-disable-next-line no-unused-expressions
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        (r = q), (g = v), (b = p);
        break;
      case 2:
        // eslint-disable-next-line no-unused-expressions
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        (r = p), (g = v), (b = t);
        break;
      case 3:
        // eslint-disable-next-line no-unused-expressions
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        (r = p), (g = q), (b = v);
        break;
      case 4:
        // eslint-disable-next-line no-unused-expressions
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        (r = t), (g = p), (b = v);
        break;
      case 5:
        // eslint-disable-next-line no-unused-expressions
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        (r = v), (g = p), (b = q);
        break;
      default:
        break;
    }

    return {
      r,
      g,
      b,
    };
  };

  const normalizeColor = (input: { r: any; g: any; b: any }) => {
    let output = {
      r: input.r / 255,
      g: input.g / 255,
      b: input.b / 255,
    };
    return output;
  };

  const wrap = (value: number, min: number, max: number) => {
    let range = max - min;
    if (range === 0) return min;
    return ((value - min) % range) + min;
  };

  const getResolution = (resolution: number) => {
    let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;

    let min = Math.round(resolution);
    let max = Math.round(resolution * aspectRatio);

    if (gl.drawingBufferWidth > gl.drawingBufferHeight)
      return { width: max, height: min };
    else return { width: min, height: max };
  };

  const getTextureScale = (
    texture: {
      texture?: any;
      width: any;
      height: any;
      attach?: (id: any) => any;
    },
    width: number,
    height: number
  ) => {
    return {
      x: width / texture.width,
      y: height / texture.height,
    };
  };

  const scaleByPixelRatio = (input: number) => {
    let pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
  };

  const hashCode = (s: string) => {
    if (s.length === 0) return 0;
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  };

  return <canvas ref={canvasRef} height={height || 0} width={width || 0} />;
};

export default Canvas;
