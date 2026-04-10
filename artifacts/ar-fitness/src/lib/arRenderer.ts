/*
 * arRenderer.ts — Three.js AR scene management
 *
 * Responsibilities:
 *   - Create a Three.js WebGLRenderer attached to a canvas element
 *   - Set up a perspective camera and AR marker tracking via AR.js
 *   - Build a stick-figure human model from cylinder and sphere geometries
 *   - Drive the figure's joint positions from Pose data each frame
 *   - Draw colored guide lines (posture overlays) on top of the figure
 *   - Expose frame data globally so React can read current angle/posture
 *   - Provide a clean destroy() method for React cleanup
 *
 * AR strategy:
 *   AR.js is loaded globally via <script> tags in index.html.
 *   We use the THREEx.ArToolkitSource + THREEx.ArToolkitContext API
 *   to access the device camera and detect a Hiro marker pattern.
 *   The stick figure is parented to a marker object so it tracks the marker.
 *
 *   When the camera is unavailable (permission denied, no HTTPS, etc.) the
 *   renderer falls back to "demo mode": a dark background with the figure
 *   rotating slowly so the user can still see and follow the workout.
 *
 * TypeScript note:
 *   Three.js is loaded via CDN script tag, so we access it as window.THREE.
 *   We import types from 'three' for IDE/compile-time checking, but at
 *   runtime the actual constructors come from the global window.THREE object.
 */

import type * as THREE_TYPES from "three";
import type { Pose as FitnessPose, JointName, ExerciseId } from "./fitness";
import { getPoseAtTime } from "./fitness";

// ── Runtime: access Three.js from the CDN global ─────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const THREE = (window as any).THREE as typeof THREE_TYPES;

// ── AR.js interface types (CDN only, not available as npm package) ────────
interface ArToolkitSource {
  init(onReady: () => void, onError?: (err: unknown) => void): void;
  onResizeElement(): void;
  copyElementSizeTo(el: HTMLElement): void;
  domElement: HTMLVideoElement;
  ready: boolean;
}

interface ArToolkitContext {
  init(onCompleted: () => void): void;
  update(srcEl: HTMLVideoElement): void;
  getDefaultCamera(): THREE_TYPES.Camera;
}

interface THREEx {
  ArToolkitSource: new (opts: Record<string, unknown>) => ArToolkitSource;
  ArToolkitContext: new (opts: Record<string, unknown>) => ArToolkitContext;
  ArMarkerControls: new (
    ctx: ArToolkitContext,
    root: THREE_TYPES.Object3D,
    opts: Record<string, unknown>
  ) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const THREEx = (window as any).THREEx as THREEx | undefined;

// ── Expose animation frame data globally for the React polling interval ───
declare global {
  interface Window {
    __ARFitnessFrameData?: { angleValue: number; postureOk: boolean };
    Pose?: any;
  }
}

// ── Bone pair definitions (which joints to connect with a cylinder) ───────
const BONE_PAIRS: [JointName, JointName][] = [
  ["head",          "neck"],
  ["neck",          "leftShoulder"],
  ["neck",          "rightShoulder"],
  ["leftShoulder",  "leftElbow"],
  ["rightShoulder", "rightElbow"],
  ["leftElbow",     "leftHand"],
  ["rightElbow",    "rightHand"],
  ["neck",          "hip"],
  ["hip",           "leftKnee"],
  ["hip",           "rightKnee"],
  ["leftKnee",      "leftFoot"],
  ["rightKnee",     "rightFoot"],
];

// ── Guide joints (three joints that form the angle to highlight) ──────────
const GUIDE_JOINTS: Record<ExerciseId, [JointName, JointName, JointName]> = {
  squats:            ["hip",           "leftKnee",      "leftFoot"],
  arm_raises:        ["neck",          "leftShoulder",  "leftElbow"],
  lunges:            ["hip",           "rightKnee",     "rightFoot"],
  push_ups:          ["leftShoulder",  "leftElbow",     "leftHand"],
  hip_flexor:        ["hip",           "rightKnee",     "rightFoot"],
  shoulder_circles:  ["neck",          "leftShoulder",  "leftElbow"],
  bicep_curls:       ["leftShoulder",  "leftElbow",     "leftHand"],
  tricep_extensions: ["leftShoulder",  "leftElbow",     "leftHand"],
  front_raises:      ["neck",          "leftShoulder",  "leftElbow"],
  overhead_press:    ["leftShoulder",  "leftElbow",     "leftHand"],
  chest_squeeze:     ["leftShoulder",  "neck",          "rightShoulder"],
};

const ALL_JOINTS: JointName[] = [
  "head", "neck",
  "leftShoulder", "rightShoulder",
  "leftElbow", "rightElbow",
  "leftHand", "rightHand",
  "hip", "leftKnee", "rightKnee",
  "leftFoot", "rightFoot",
];

export class ARRenderer {
  private renderer!: THREE_TYPES.WebGLRenderer;
  private scene!: THREE_TYPES.Scene;
  private camera!: THREE_TYPES.Camera;
  private arSource?: ArToolkitSource;
  private arContext?: ArToolkitContext;
  private demoVideo?: HTMLVideoElement;
  private demoStream?: MediaStream;
  private poseDetector?: any;
  private liveLandmarks?: Array<{ x: number; y: number; z: number }>;

  private markerRoot!: THREE_TYPES.Object3D;
  private jointMeshes = new Map<JointName, THREE_TYPES.Mesh>();
  private boneMeshes = new Map<string, THREE_TYPES.Mesh>();
  private guideLines: THREE_TYPES.Line[] = [];

  private animFrameId: number | null = null;
  private clock!: THREE_TYPES.Clock;

  private currentExercise: ExerciseId;
  private repDurationMs: number;
  private _repCycleT = 0;

  private isDemo = false;
  private liveTracking = false;
  private shouldCountReps = false;
  private repConfirmedDown = false;
  private repCount = 0;
  private repMotionState: "unknown" | "below" | "above" = "unknown";
  private repMovementAngle = 0;
  private lastRepTimestamp = 0;
  private currentAngle = 0;
  private currentPostureOk = true;
  private liveScale = 1.0;
  private liveCenterX = 0.5;
  private liveCenterY = 0.5;
  private mirrorPose = false;
  private angleHistory: number[] = [];

  private initResolver: ((mode: "ar" | "live" | "demo") => void) | null = null;
  private initPromise: Promise<"ar" | "live" | "demo">;

  constructor(private canvas: HTMLCanvasElement, initialExercise: ExerciseId = "squats", initialRepDurationMs = 2500) {
    if (!THREE) throw new Error("Three.js not loaded — check CDN script tag");
    this.currentExercise = initialExercise;
    this.repDurationMs = initialRepDurationMs;
    this.initPromise = new Promise((resolve) => {
      this.initResolver = resolve;
    });
    this._setup();
  }

  private _isLivePoseAvailable() {
    return Array.isArray(this.liveLandmarks) && this.liveLandmarks.length > 0;
  }

  private _updateLiveTransform() {
    if (!this._isLivePoseAvailable()) return;
    const leftShoulder = this.liveLandmarks![11];
    const rightShoulder = this.liveLandmarks![12];
    const leftHip = this.liveLandmarks![23];
    const rightHip = this.liveLandmarks![24];

    const shoulderDist = Math.hypot(
      leftShoulder.x - rightShoulder.x,
      leftShoulder.y - rightShoulder.y,
    );
    const hipDist = Math.hypot(
      leftHip.x - rightHip.x,
      leftHip.y - rightHip.y,
    );

    // Mirror if the left/right landmarks are reversed in camera space.
    // This keeps the stick figure orientation aligned with a sideways user.
    this.mirrorPose = leftShoulder.x > rightShoulder.x && leftHip.x > rightHip.x;

    const scale = Math.max(0.7, Math.min(2.2, 1.25 / Math.max(shoulderDist, 0.1)));
    this.liveScale = scale;
    this.liveCenterX = (leftHip.x + rightHip.x) / 2;
    this.liveCenterY = (leftHip.y + rightHip.y) / 2;
  }

  private _landmarkToJoint(index: number) {
    const landmark = this.liveLandmarks?.[index];
    if (!landmark) return [0, 0, 0] as [number, number, number];

    const x = (landmark.x - this.liveCenterX) * this.liveScale;
    return [
      this.mirrorPose ? -x : x,
      (this.liveCenterY - landmark.y) * this.liveScale * 1.3,
      landmark.z * 2.0 * this.liveScale,
    ] as [number, number, number];
  }

  private _vectorFromJoint(joint: [number, number, number]) {
    return new THREE.Vector3(joint[0], joint[1], joint[2]);
  }

  private _getLivePose(): FitnessPose | null {
    if (!this._isLivePoseAvailable()) return null;

    this._updateLiveTransform();
    const leftShoulder = this._vectorFromJoint(this._landmarkToJoint(11));
    const rightShoulder = this._vectorFromJoint(this._landmarkToJoint(12));
    const leftHip = this._vectorFromJoint(this._landmarkToJoint(23));
    const rightHip = this._vectorFromJoint(this._landmarkToJoint(24));

    const midpoint = (a: THREE_TYPES.Vector3, b: THREE_TYPES.Vector3) => new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);

    return {
      head: this._landmarkToJoint(0),
      neck: midpoint(leftShoulder, rightShoulder).toArray() as [number, number, number],
      leftShoulder: this._landmarkToJoint(11),
      rightShoulder: this._landmarkToJoint(12),
      leftElbow: this._landmarkToJoint(13),
      rightElbow: this._landmarkToJoint(14),
      leftHand: this._landmarkToJoint(15),
      rightHand: this._landmarkToJoint(16),
      hip: midpoint(leftHip, rightHip).toArray() as [number, number, number],
      leftKnee: this._landmarkToJoint(25),
      rightKnee: this._landmarkToJoint(26),
      leftFoot: this._landmarkToJoint(27),
      rightFoot: this._landmarkToJoint(28),
    };
  }

  private _angleBetween(a: [number, number, number], b: [number, number, number], c: [number, number, number]) {
    const vecA = this._vectorFromJoint(a);
    const vecB = this._vectorFromJoint(b);
    const vecC = this._vectorFromJoint(c);
    const ab = new THREE.Vector3().subVectors(vecA, vecB).normalize();
    const cb = new THREE.Vector3().subVectors(vecC, vecB).normalize();
    return Math.round(THREE.MathUtils.radToDeg(Math.acos(Math.max(-1, Math.min(1, ab.dot(cb))))));
  }

  private _getAngleRange(exerciseId: ExerciseId) {
    switch (exerciseId) {
      case "squats": return { low: 75, high: 160 };
      case "arm_raises": return { low: 10, high: 95 };
      case "lunges": return { low: 70, high: 160 };
      case "push_ups": return { low: 65, high: 175 };
      case "hip_flexor": return { low: 80, high: 160 };
      case "shoulder_circles": return { low: 0, high: 360 };
      case "bicep_curls": return { low: 30, high: 175 };
      case "tricep_extensions": return { low: 80, high: 170 };
      case "front_raises": return { low: 10, high: 95 };
      case "overhead_press": return { low: 90, high: 175 };
      case "chest_squeeze": return { low: 45, high: 175 };
      default: return { low: 0, high: 180 };
    }
  }

  private _angleAt(jointA: [number, number, number], jointB: [number, number, number], jointC: [number, number, number]) {
    return this._angleBetween(jointA, jointB, jointC);
  }

  private _exerciseShoulderAngle(pose: FitnessPose, side: "left" | "right") {
    return this._angleAt(
      pose[side === "left" ? "hip" : "hip"],
      pose[side === "left" ? "leftShoulder" : "rightShoulder"],
      pose[side === "left" ? "leftElbow" : "rightElbow"],
    );
  }

  private _exerciseElbowAngle(pose: FitnessPose, side: "left" | "right") {
    return this._angleAt(
      pose[side === "left" ? "leftShoulder" : "rightShoulder"],
      pose[side === "left" ? "leftElbow" : "rightElbow"],
      pose[side === "left" ? "leftHand" : "rightHand"],
    );
  }

  private _exerciseKneeAngle(pose: FitnessPose, side: "left" | "right") {
    return this._angleAt(
      pose[side === "left" ? "hip" : "hip"],
      pose[side === "left" ? "leftKnee" : "rightKnee"],
      pose[side === "left" ? "leftFoot" : "rightFoot"],
    );
  }

  private _computeLiveAngle(pose: FitnessPose) {
    const leftElbow = this._exerciseElbowAngle(pose, "left");
    const rightElbow = this._exerciseElbowAngle(pose, "right");
    const leftShoulder = this._exerciseShoulderAngle(pose, "left");
    const rightShoulder = this._exerciseShoulderAngle(pose, "right");
    const leftKnee = this._exerciseKneeAngle(pose, "left");
    const rightKnee = this._exerciseKneeAngle(pose, "right");

    switch (this.currentExercise) {
      case "bicep_curls":
      case "tricep_extensions":
      case "push_ups":
        return Math.min(leftElbow, rightElbow);
      case "arm_raises":
      case "front_raises":
      case "overhead_press":
        return Math.round((leftShoulder + rightShoulder) / 2);
      case "shoulder_circles":
        return Math.round((leftShoulder + rightShoulder) / 2);
      case "squats":
        return Math.round((leftKnee + rightKnee) / 2);
      case "lunges": {
        const leftDiff = Math.abs(leftKnee - 180);
        const rightDiff = Math.abs(rightKnee - 180);
        return leftDiff > rightDiff ? leftKnee : rightKnee;
      }
      case "hip_flexor":
        return rightKnee;
      case "chest_squeeze":
        return this._angleAt(pose.leftShoulder, pose.neck, pose.rightShoulder);
      default: {
        const joints = GUIDE_JOINTS[this.currentExercise];
        return joints ? this._angleAt(pose[joints[0]], pose[joints[1]], pose[joints[2]]) : 0;
      }
    }
  }

  private _computePosture(pose: FitnessPose, angleValue: number) {
    switch (this.currentExercise) {
      case "squats": return angleValue >= 85 && angleValue <= 175;
      case "arm_raises": return angleValue >= 75 && angleValue <= 95;
      case "lunges": return angleValue >= 80 && angleValue <= 100;
      case "push_ups": return angleValue >= 80 && angleValue <= 100;
      case "hip_flexor": return angleValue >= 100 && angleValue <= 130;
      case "shoulder_circles": return true;
      case "bicep_curls": return angleValue >= 30 && angleValue <= 60;
      case "tricep_extensions": return angleValue >= 80 && angleValue <= 105;
      case "front_raises": return angleValue >= 80 && angleValue <= 100;
      case "overhead_press": return angleValue >= 155 && angleValue <= 175;
      case "chest_squeeze": return angleValue >= 50 && angleValue <= 75;
      default: return true;
    }
  }

  private _updateRepCounting(angle: number) {
    if (!this.shouldCountReps) return;

    const now = Date.now();
    const { low, high } = this._getAngleRange(this.currentExercise);
    const range = Math.max(1, high - low);
    const downThreshold = low + Math.max(12, range * 0.18);
    const upThreshold = low + Math.min(range * 0.7, Math.max(28, range * 0.55));
    const minRepGapMs = 900;

    if (this.repMotionState === "unknown") {
      this.repMotionState = angle <= downThreshold ? "below" : "above";
      this.repMovementAngle = angle;
    }

    if (this.repMotionState === "below") {
      if (angle >= upThreshold && now - this.lastRepTimestamp >= minRepGapMs) {
        this.repCount += 1;
        this.repMotionState = "above";
        this.repMovementAngle = angle;
        this.lastRepTimestamp = now;
      }
    } else if (this.repMotionState === "above") {
      if (angle <= downThreshold) {
        this.repMotionState = "below";
        this.repMovementAngle = angle;
      }
    }
  }

  private async _startCameraTracking() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Webcam API unavailable");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });

    const video = document.createElement("video");
    video.id = "ar-fitness-webcam-demo";
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.style.position = "fixed";
    video.style.top = "0";
    video.style.left = "0";
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";
    video.style.zIndex = "0";
    video.srcObject = stream;

    document.body.appendChild(video);
    this.demoVideo = video;
    this.demoStream = stream;

    await video.play().catch(() => {
      // Some browsers require a gesture to play. The stream is still active.
    });

    if (this.camera) {
      this.scene.remove(this.camera);
    }
    const liveCamera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 100);
    liveCamera.position.set(0, 1.4, 4);
    liveCamera.lookAt(0, 1.4, 0);
    this.camera = liveCamera;
    this.scene.add(this.camera);
    this.renderer.setClearColor(0x000000, 0);

    const PoseClass = window.Pose;
    if (!PoseClass) {
      throw new Error("MediaPipe Pose not loaded");
    }

    const detector = new PoseClass({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`,
    });
    detector.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    detector.onResults((result: any) => {
      if (!result.poseLandmarks) return;
      this.liveLandmarks = result.poseLandmarks.map((landmark: any) => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
      }));
    });

    this.poseDetector = detector;
    this.liveTracking = true;

    const process = async () => {
      if (!this.demoVideo || !this.poseDetector) return;
      await this.poseDetector.send({ image: this.demoVideo });
      requestAnimationFrame(process);
    };
    process();
  }

  private _setup() {
    this.clock = new THREE.Clock();

    // Renderer — alpha:true keeps background transparent (camera video shows through)
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    // Scene
    this.scene = new THREE.Scene();

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 0.5);
    dir.position.set(2, 4, 3);
    this.scene.add(dir);

    // Camera placeholder (replaced after AR context init)
    this.camera = new THREE.Camera();
    this.scene.add(this.camera);

    // Marker root — figure is parented here, moves with the detected marker
    this.markerRoot = new THREE.Group();
    this.scene.add(this.markerRoot);

    this._buildFigure();
    this._buildGuideLines();

    this._initLiveTracking();

    window.addEventListener("resize", this._onResize);
  }

  private async _initAR() {
    if (!THREEx) return this._initLiveTracking();

    this.arSource = new THREEx.ArToolkitSource({ sourceType: "webcam" });
    this.arContext = new THREEx.ArToolkitContext({
      cameraParametersUrl:
        "https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/data/camera_para.dat",
      detectionMode: "mono",
    });

    this.arSource.init(
      async () => {
        try {
          this.arContext!.init(() => {
            this.camera = this.arContext!.getDefaultCamera();
            this.scene.add(this.camera);
            new THREEx!.ArMarkerControls(this.arContext!, this.markerRoot, {
              type: "pattern",
              patternUrl:
                "https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/data/patt.hiro",
            });
            this._resolveInit("ar");
          });
        } catch (ctxErr) {
          console.warn("AR context init failed — falling back to live pose tracking:", ctxErr);
          await this._initLiveTracking();
          return;
        }

        this.arSource!.onResizeElement();
        this.arSource!.copyElementSizeTo(this.renderer.domElement);
        this._startARLoop();
      },
      async (err) => {
        console.warn("AR camera unavailable — falling back to live pose tracking:", err);
        await this._initLiveTracking();
      }
    );
  }

  private async _initLiveTracking() {
    try {
      await this._startCameraTracking();
      this._resolveInit("live");
      this._startARLoop();
    } catch (err) {
      console.warn("Live camera tracking unavailable — using static demo fallback:", err);
      this._resolveInit("demo");
      this._startDemo();
    }
  }

  // ── AR render loop ────────────────────────────────────────────────────

  private _startARLoop() {
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
      const delta = this.clock.getDelta() * 1000;

      if (this.arSource?.ready && this.arContext) {
        this.arContext.update(this.arSource.domElement);
      }
      this._tick(delta);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  private _resolveInit(mode: "ar" | "live" | "demo") {
    if (this.initResolver) {
      this.initResolver(mode);
      this.initResolver = null;
    }
  }

  private _startDemo() {
    this.isDemo = true;
    this._resolveInit("demo");

    // Transparent by default so a live webcam feed can show through.
    this.renderer.setClearColor(0x000000, 0);

    const demoCam = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 100);
    demoCam.position.set(0, 1.1, 3.8);
    demoCam.lookAt(0, 1.1, 0);
    this.camera = demoCam;

    // Show all joints immediately in demo (no marker needed)
    for (const m of this.jointMeshes.values()) m.visible = true;
    for (const m of this.boneMeshes.values()) m.visible = true;

    let rotY = 0;
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
      const delta = this.clock.getDelta() * 1000;
      rotY += delta * 0.0002;
      this.markerRoot.rotation.y = rotY;
      this._tick(delta);
      this.renderer.render(this.scene, this.camera);
    };
    loop();

    this.renderer.setClearColor(0x0a0f1a, 1);
  }

  // ── Shared tick: animate figure + guide lines + expose frame data ──────

  private _smoothAngle(angle: number) {
    this.angleHistory.push(angle);
    if (this.angleHistory.length > 5) this.angleHistory.shift();
    return Math.round(this.angleHistory.reduce((sum, a) => sum + a, 0) / this.angleHistory.length);
  }

  private _tick(deltaMs: number) {
    if (this._isLivePoseAvailable()) {
      const pose = this._getLivePose()!;
      const rawAngle = this._computeLiveAngle(pose);
      const angleValue = this._smoothAngle(rawAngle);
      const postureOk = this._computePosture(pose, angleValue);
      this.currentAngle = angleValue;
      this.currentPostureOk = postureOk;
      this._updateRepCounting(angleValue);
      this._applyPose(pose, postureOk);
      this._updateGuideLines(pose, postureOk);
      window.__ARFitnessFrameData = { angleValue, postureOk };
      return;
    }

    this._repCycleT = (this._repCycleT + deltaMs / this.repDurationMs) % 1;
    const { pose, angleValue, postureOk } = getPoseAtTime(this.currentExercise, this._repCycleT);
    this.currentAngle = angleValue;
    this.currentPostureOk = postureOk;
    this._updateRepCounting(angleValue);

    this._applyPose(pose, postureOk);
    this._updateGuideLines(pose, postureOk);
    window.__ARFitnessFrameData = { angleValue, postureOk };
  }

  // ── Build stick figure (spheres for joints, cylinders for bones) ───────

  private _buildFigure() {
    const jointGeo = new THREE.SphereGeometry(0.04, 10, 10);
    const jointMat = new THREE.MeshPhongMaterial({ color: 0x22ee88 });
    const headGeo = new THREE.SphereGeometry(0.09, 14, 14);
    const headMat = new THREE.MeshPhongMaterial({ color: 0xeeeeff });

    for (const name of ALL_JOINTS) {
      const isHead = name === "head";
      const mesh = new THREE.Mesh(isHead ? headGeo : jointGeo.clone(), isHead ? headMat : jointMat.clone());
      mesh.visible = false;
      this.markerRoot.add(mesh);
      this.jointMeshes.set(name, mesh);
    }

    const boneMat = new THREE.MeshPhongMaterial({ color: 0x44ffaa });
    for (const [a, b] of BONE_PAIRS) {
      const geo = new THREE.CylinderGeometry(0.018, 0.018, 1, 8);
      const mesh = new THREE.Mesh(geo, boneMat.clone());
      mesh.visible = false;
      this.markerRoot.add(mesh);
      this.boneMeshes.set(`${a}→${b}`, mesh);
    }
  }

  // ── Build guide line overlays ──────────────────────────────────────────

  private _buildGuideLines() {
    /*
     * Two line segments (A→B and B→C) highlight the angle being measured.
     * A→B is drawn in green (or red when posture is off).
     * B→C is drawn in yellow (or orange when posture is off).
     */
    const colors = [0x00ffaa, 0xffdd00];
    for (let i = 0; i < 2; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 0, 0),
      ]);
      const mat = new THREE.LineBasicMaterial({ color: colors[i], linewidth: 2 });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      this.markerRoot.add(line);
      this.guideLines.push(line);
    }
  }

  // ── Apply a Pose to the figure ─────────────────────────────────────────

  private _applyPose(pose: FitnessPose, postureOk: boolean) {
    // Update joint sphere positions
    for (const name of ALL_JOINTS) {
      const mesh = this.jointMeshes.get(name);
      if (!mesh) continue;
      const [x, y, z] = pose[name];
      mesh.position.set(x, y, z);
      mesh.visible = true;
    }

    // Position + orient each bone cylinder between two joints
    for (const [a, b] of BONE_PAIRS) {
      const boneMesh = this.boneMeshes.get(`${a}→${b}`);
      if (!boneMesh) continue;

      const pA = new THREE.Vector3(...pose[a]);
      const pB = new THREE.Vector3(...pose[b]);
      const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
      const len = pA.distanceTo(pB);

      boneMesh.position.copy(mid);
      boneMesh.scale.set(1, len, 1);

      // Orient the cylinder along the bone direction
      const dir = new THREE.Vector3().subVectors(pB, pA).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      boneMesh.quaternion.setFromUnitVectors(up, dir);

      // Green = good posture, red = bad posture
      (boneMesh.material as THREE_TYPES.MeshPhongMaterial).color.setHex(
        postureOk ? 0x44ffaa : 0xff4455
      );
      boneMesh.visible = true;
    }
  }

  // ── Update colored guide lines ─────────────────────────────────────────

  private _updateGuideLines(pose: FitnessPose, postureOk: boolean) {
    const triple = GUIDE_JOINTS[this.currentExercise];
    if (!triple || this.guideLines.length < 2) return;

    const [jA, jB, jC] = triple;
    const pA = new THREE.Vector3(...pose[jA]);
    const pB = new THREE.Vector3(...pose[jB]);
    const pC = new THREE.Vector3(...pose[jC]);

    const setLine = (line: THREE_TYPES.Line, from: THREE_TYPES.Vector3, to: THREE_TYPES.Vector3, colorOk: number, colorBad: number) => {
      const geo = line.geometry as THREE_TYPES.BufferGeometry;
      geo.setFromPoints([from, to]);
      (geo.attributes.position as THREE_TYPES.BufferAttribute).needsUpdate = true;
      (line.material as THREE_TYPES.LineBasicMaterial).color.setHex(postureOk ? colorOk : colorBad);
      line.visible = true;
    };

    setLine(this.guideLines[0], pA, pB, 0x00ffaa, 0xff5566);
    setLine(this.guideLines[1], pB, pC, 0xffdd00, 0xff9900);
  }

  // ── Public API ────────────────────────────────────────────────────────

  /** Wait until the renderer has finished AR startup or demo fallback. */
  waitForReady() {
    return this.initPromise;
  }

  /** Switch to a different exercise and reset rep tracking. */
  setExercise(id: ExerciseId, repDurationMs: number) {
    this.currentExercise = id;
    this.repDurationMs = repDurationMs;
    this._repCycleT = 0;
    this.resetReps();
  }

  /** Enable or disable live rep counting. */
  setRunning(running: boolean) {
    this.shouldCountReps = running;
    if (!running) {
      this.repConfirmedDown = false;
    }
  }

  /** Reset live rep counting state. */
  resetReps() {
    this.repCount = 0;
    this.repConfirmedDown = false;
    this.repMotionState = "unknown";
    this.repMovementAngle = 0;
    this.lastRepTimestamp = 0;
    this.currentAngle = 0;
    this.currentPostureOk = true;
  }

  /** Returns the latest live rep count. */
  getRepCount() {
    return this.repCount;
  }

  /** Returns the current measured angle from the live pose tracker. */
  getCurrentAngle() {
    return this.currentAngle;
  }

  /** Returns whether the current live pose is within the posture target range. */
  getCurrentPostureOk() {
    return this.currentPostureOk;
  }

  /** Returns true when running in demo/fallback mode (camera unavailable) */
  isDemoMode() {
    return this.isDemo;
  }

  // ── Resize handler ────────────────────────────────────────────────────

  private _onResize = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.isDemo && this.camera instanceof THREE.PerspectiveCamera) {
      (this.camera as THREE_TYPES.PerspectiveCamera).aspect = window.innerWidth / window.innerHeight;
      (this.camera as THREE_TYPES.PerspectiveCamera).updateProjectionMatrix();
    }
    if (this.arSource?.ready) {
      this.arSource.onResizeElement();
      this.arSource.copyElementSizeTo(this.renderer.domElement);
    }
  };

  // ── Cleanup ───────────────────────────────────────────────────────────

  destroy() {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener("resize", this._onResize);

    if (this.arSource?.domElement) {
      const video = this.arSource.domElement;
      if (video.srcObject instanceof MediaStream) {
        for (const track of video.srcObject.getTracks()) {
          track.stop();
        }
      }
      if (video.parentElement) {
        video.parentElement.removeChild(video);
      }
    }

    if (this.demoStream) {
      for (const track of this.demoStream.getTracks()) {
        track.stop();
      }
      this.demoStream = undefined;
    }

    if (this.demoVideo && this.demoVideo.parentElement) {
      this.demoVideo.parentElement.removeChild(this.demoVideo);
      this.demoVideo = undefined;
    }

    this.renderer.dispose();
    window.__ARFitnessFrameData = undefined;
    this.arSource = undefined;
    this.arContext = undefined;
  }
}
