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
import type { Pose, JointName, ExerciseId } from "./fitness";
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
  squats:          ["hip",          "leftKnee",     "leftFoot"],
  arm_raises:      ["neck",         "leftShoulder", "leftElbow"],
  lunges:          ["hip",          "rightKnee",    "rightFoot"],
  push_ups:        ["leftShoulder", "leftElbow",    "leftHand"],
  hip_flexor:      ["hip",          "rightKnee",    "rightFoot"],
  shoulder_circles:["neck",         "leftShoulder", "leftElbow"],
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

  private markerRoot!: THREE_TYPES.Object3D;
  private jointMeshes = new Map<JointName, THREE_TYPES.Mesh>();
  private boneMeshes = new Map<string, THREE_TYPES.Mesh>();
  private guideLines: THREE_TYPES.Line[] = [];

  private animFrameId: number | null = null;
  private clock!: THREE_TYPES.Clock;

  private currentExercise: ExerciseId = "squats";
  private repDurationMs = 2500;
  private _repCycleT = 0;

  private isDemo = false;

  constructor(private canvas: HTMLCanvasElement) {
    if (!THREE) throw new Error("Three.js not loaded — check CDN script tag");
    this._setup();
  }

  // ── Setup ──────────────────────────────────────────────────────────────

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

    // Try AR.js; fall back to demo if unavailable
    if (THREEx?.ArToolkitSource) {
      this._initAR();
    } else {
      this._startDemo();
    }

    window.addEventListener("resize", this._onResize);
  }

  // ── AR.js initialization ───────────────────────────────────────────────

  private _initAR() {
    if (!THREEx) return this._startDemo();

    this.arSource = new THREEx.ArToolkitSource({ sourceType: "webcam" });
    this.arContext = new THREEx.ArToolkitContext({
      cameraParametersUrl:
        "https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/data/camera_para.dat",
      detectionMode: "mono",
    });

    this.arSource.init(
      () => {
        // Camera opened successfully
        this.arContext!.init(() => {
          this.camera = this.arContext!.getDefaultCamera();
          this.scene.add(this.camera);

          // Attach the Hiro marker tracking to our figure root
          new THREEx!.ArMarkerControls(this.arContext!, this.markerRoot, {
            type: "pattern",
            patternUrl:
              "https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/data/patt.hiro",
          });
        });

        this.arSource!.onResizeElement();
        this.arSource!.copyElementSizeTo(this.renderer.domElement);
        this._startARLoop();
      },
      (err) => {
        console.warn("AR camera unavailable — using demo mode:", err);
        this._startDemo();
      }
    );
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

  // ── Demo mode: rotating figure on dark background ─────────────────────

  private _startDemo() {
    this.isDemo = true;

    // Opaque background for demo so the canvas is visible without a camera
    this.renderer.setClearColor(0x0a0f1a, 1);

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
  }

  // ── Shared tick: animate figure + guide lines + expose frame data ──────

  private _tick(deltaMs: number) {
    this._repCycleT = (this._repCycleT + deltaMs / this.repDurationMs) % 1;
    const { pose, angleValue, postureOk } = getPoseAtTime(this.currentExercise, this._repCycleT);

    this._applyPose(pose, postureOk);
    this._updateGuideLines(pose, postureOk);

    // Write frame data to the global so WorkoutScreen's interval can read it
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

  private _applyPose(pose: Pose, postureOk: boolean) {
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

  private _updateGuideLines(pose: Pose, postureOk: boolean) {
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

  /** Switch to a different exercise. Resets the animation cycle. */
  setExercise(id: ExerciseId, repDurationMs: number) {
    this.currentExercise = id;
    this.repDurationMs = repDurationMs;
    this._repCycleT = 0;
  }

  /** 0–1 position within the current rep cycle (used for rep counting) */
  getRepCycleT() {
    return this._repCycleT;
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
    this.renderer.dispose();
    window.__ARFitnessFrameData = undefined;
  }
}
