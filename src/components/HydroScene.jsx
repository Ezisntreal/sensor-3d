import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const C = {
  dam: { h: 160, R: 1300, arc: 1, baseT: 90, topT: 16, seg: 64, hSeg: 8 },
  water: { resLvl: 112.3, rivLvl: 8 }
};

const TERRAIN_Y_OFFSET = -3;

const SENSOR_DEFS = [
  { p: [0, 68, 28], n: 'WC1', z: 'Mid-Wall - Center', status: 'normal' },
  { p: [-120, 68, 22], n: 'WL1', z: 'Mid-Wall - Left', status: 'disconnected' },
  { p: [120, 68, 22], n: 'WR1', z: 'Mid-Wall - Right', status: 'warning' },
  { p: [0, 12, 260], n: 'DOWN-01', z: 'Downstream - Tailrace', status: 'normal' },
  { p: [0, 117, -160], n: 'WAU', z: 'Reservoir', status: 'normal' }
];

const STATUS_COLOR = { normal: 0x3fb950, disconnected: 0xd29922, warning: 0xf85149 };

function terrainHeightAt(x, z) {
  const ax = Math.abs(x);
  let h = 0;
  if (ax > 500) h = (ax - 500) * 0.45;
  h = Math.min(h, 280);
  h +=
    Math.sin(x * 0.009 + z * 0.007) * 14 +
    Math.sin(x * 0.022 - z * 0.016) * 7 +
    Math.cos(z * 0.005) * 6;
  if (z > 60 && ax < 110) {
    const f = Math.max(0, 1 - ax / 110);
    h *= 1 - f * 0.92;
  }
  return Math.max(h, -4);
}

function makeDamGeometry() {
  const { h, R, arc, baseT, topT, seg, hSeg } = C.dam;
  const bHW = baseT / 2;
  const tHW = topT / 2;
  const v = [];
  const idx = [];

  for (let j = 0; j <= hSeg; j += 1) {
    const y = (j / hSeg) * h;
    const t = j / hSeg;
    const hw = bHW + (tHW - bHW) * t;
    for (let i = 0; i <= seg; i += 1) {
      const th = -arc / 2 + (i / seg) * arc;
      const s = Math.sin(th);
      const c = Math.cos(th);
      const cx = R * s;
      const cz = R * (c - 1);
      v.push(cx + hw * s, y, cz + hw * c);
      v.push(cx - hw * s, y, cz - hw * c);
    }
  }

  const stride = (seg + 1) * 2;
  for (let j = 0; j < hSeg; j += 1) {
    for (let i = 0; i < seg; i += 1) {
      const o = j * stride + i * 2;
      const ib = o + 1;
      const or = j * stride + (i + 1) * 2;
      const ir = or + 1;
      const ot = (j + 1) * stride + i * 2;
      const it = ot + 1;
      const otr = (j + 1) * stride + (i + 1) * 2;
      const itr = otr + 1;

      idx.push(o, or, ot, or, otr, ot);
      idx.push(ib, it, ir, ir, it, itr);
      if (j === hSeg - 1) idx.push(ot, otr, it, otr, itr, it);
      if (j === 0) idx.push(o, ib, or, or, ib, ir);
    }
  }

  for (let j = 0; j < hSeg; j += 1) {
    let a = j * stride;
    let b = a + 1;
    let c = (j + 1) * stride;
    let d = c + 1;
    idx.push(a, b, c, b, d, c);
    a = j * stride + seg * 2;
    b = a + 1;
    c = (j + 1) * stride + seg * 2;
    d = c + 1;
    idx.push(a, c, b, b, c, d);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function makeTerrainGeometry() {
  const geo = new THREE.PlaneGeometry(3200, 3200, 100, 100);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i += 1) {
    const wx = p.getX(i);
    const wz = -p.getY(i);
    p.setZ(i, terrainHeightAt(wx, wz));
  }
  geo.computeVertexNormals();
  return geo;
}

function makeReservoirFillGeometry() {
  const { h, R, arc, seg, baseT, topT } = C.dam;
  const wl = C.water.resLvl;
  const fillGeo = new THREE.PlaneGeometry(1, 1, seg, 1);
  const p = fillGeo.attributes.position;
  const ratio = wl / h;
  const hw = baseT / 2 + (topT / 2 - baseT / 2) * ratio;

  for (let i = 0; i <= seg; i += 1) {
    const th = -arc / 2 + (i / seg) * arc;
    const s = Math.sin(th);
    const c = Math.cos(th);
    const vX = R * s - hw * s;
    const vZ = R * (c - 1) - hw * c;

    p.setXYZ(i, vX, vZ, 0);
    p.setXYZ(i + seg + 1, vX, -135, 0);
  }

  fillGeo.computeVertexNormals();
  return fillGeo;
}

function makeGaugeLabelTexture(label) {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 96;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, cv.width - 4, cv.height - 4);
  ctx.font = 'bold 42px Segoe UI';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000000';
  ctx.fillText(label, cv.width / 2, cv.height / 2);

  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function SceneContents({ showSensors, wireframe, waterAnim, fogOn, onSensorSelect, onSensorSummaryChange }) {
  const { scene, camera } = useThree();

  const materials = useMemo(
    () => ({
      conc: new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.82, metalness: 0.04 }),
      concL: new THREE.MeshStandardMaterial({ color: 0x9a9898, roughness: 0.78, metalness: 0.04 }),
      water: new THREE.MeshPhongMaterial({
        color: 0x1a7faf,
        transparent: true,
        opacity: 0.72,
        specular: 0x66aadd,
        shininess: 120,
        side: THREE.DoubleSide
      }),
      watD: new THREE.MeshPhongMaterial({
        color: 0x0d5a7f,
        transparent: true,
        opacity: 0.58,
        specular: 0x4488bb,
        shininess: 80,
        side: THREE.DoubleSide
      }),
      terr: new THREE.MeshLambertMaterial({ color: 0x3b7d3b, flatShading: true }),
      gate: new THREE.MeshStandardMaterial({ color: 0x505050, roughness: 0.55, metalness: 0.3 }),
      bldg: new THREE.MeshStandardMaterial({ color: 0x6e6e6e, roughness: 0.65, metalness: 0.1 }),
      road: new THREE.MeshLambertMaterial({ color: 0x3e3e3e }),
      white: new THREE.MeshPhongMaterial({ color: 0x88ccee, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    }),
    []
  );

  const allMats = useMemo(() => Object.values(materials), [materials]);

  const damGeometry = useMemo(() => makeDamGeometry(), []);
  const terrainGeometry = useMemo(() => makeTerrainGeometry(), []);
  const resFillGeometry = useMemo(() => makeReservoirFillGeometry(), []);
  const resWaterGeometry = useMemo(() => new THREE.PlaneGeometry(1200, 1100, 32, 32), []);
  const rivGeometry = useMemo(() => new THREE.PlaneGeometry(110, 1100, 10, 40), []);
  const lowRivGeometry = useMemo(() => new THREE.PlaneGeometry(240, 1280, 14, 46), []);
  const lowWaterMat = useMemo(() => {
    const m = materials.watD.clone();
    m.opacity = 0.36;
    return m;
  }, [materials.watD]);

  const gaugeTexture = useMemo(() => makeGaugeLabelTexture(`${C.water.resLvl.toFixed(1)}m`), []);

  const treeInstances = useMemo(() => {
    const trees = [];
    const addTree = (x, z) => {
      if (Math.abs(x) < 220 && Math.abs(z) < 250) return;
      if (Math.abs(x) < 95 && z > -40 && z < 1200) return;
      const groundY = terrainHeightAt(x, z) + TERRAIN_Y_OFFSET;
      const sc = 0.75 + Math.random() * 1.0;
      trees.push({ x, z, y: groundY, sc });
    };

    for (let n = 0; n < 40; n += 1) {
      const x = (Math.random() - 0.5) * 2400;
      const z = -120 + Math.random() * 1320;
      addTree(x, z);
    }

    for (let n = 0; n < 120; n += 1) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = side * (520 + Math.random() * 740);
      const z = -80 + Math.random() * 1240;
      addTree(x, z);
    }

    return trees;
  }, []);

  const [sensorData, setSensorData] = useState(() =>
    SENSOR_DEFS.map(d => ({
      name: d.n,
      zone: d.z,
      status: d.status,
      temp: +(20 + Math.random() * 10).toFixed(1),
      pres: +(90 + Math.random() * 20).toFixed(1),
      vib: +(Math.random() * 3).toFixed(2)
    }))
  );

  const sensorMeshRefs = useRef([]);
  const sensorMatRefs = useRef([]);
  const sensorRingRefs = useRef([]);
  const sensorRingMatRefs = useRef([]);
  const sensorLightRefs = useRef([]);
  const sensorPhase = useMemo(() => SENSOR_DEFS.map(() => Math.random() * Math.PI * 2), []);

  const resWaterRef = useRef(null);
  const rivWaterRef = useRef(null);

  useEffect(() => {
    scene.background = new THREE.Color(0x6bb0e6);
    scene.fog = fogOn ? new THREE.FogExp2(0x7fbde8, 0.00048) : null;
  }, [fogOn, scene]);

  useEffect(() => {
    allMats.forEach(m => {
      m.wireframe = wireframe;
      m.needsUpdate = true;
    });
  }, [allMats, wireframe]);

  useEffect(() => {
    const id = setInterval(() => {
      setSensorData(prev =>
        prev.map(s => ({
          ...s,
          temp: +(17 + Math.random() * 15).toFixed(1),
          pres: +(82 + Math.random() * 32).toFixed(1),
          vib: +(Math.random() * 9).toFixed(2)
        }))
      );
    }, 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let warning = 0;
    let active = 0;

    sensorData.forEach((data, i) => {
      const c = STATUS_COLOR[data.status] || STATUS_COLOR.normal;
      if (data.status === 'warning') warning += 1;
      if (data.status !== 'disconnected') active += 1;

      if (sensorMatRefs.current[i]) {
        sensorMatRefs.current[i].color.setHex(c);
        sensorMatRefs.current[i].emissive.setHex(c);
      }
      if (sensorRingMatRefs.current[i]) {
        sensorRingMatRefs.current[i].color.setHex(c);
      }
      if (sensorLightRefs.current[i]) {
        sensorLightRefs.current[i].color.setHex(c);
      }
    });

    onSensorSummaryChange({ active, total: sensorData.length, warning });
  }, [sensorData, onSensorSummaryChange]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (waterAnim && resWaterRef.current) {
      const rp = resWaterRef.current.geometry.attributes.position;
      for (let i = 0; i < rp.count; i += 1) {
        const x = rp.getX(i);
        const y = rp.getY(i);
        rp.setZ(
          i,
          Math.sin(x * 0.028 + t * 0.65) * 0.7 +
            Math.cos(y * 0.022 + t * 0.45) * 0.55 +
            Math.sin((x + y) * 0.018 + t * 0.85) * 0.35
        );
      }
      rp.needsUpdate = true;
    }

    if (waterAnim && rivWaterRef.current) {
      const rp = rivWaterRef.current.geometry.attributes.position;
      for (let i = 0; i < rp.count; i += 1) {
        const x = rp.getX(i);
        const y = rp.getY(i);
        rp.setZ(
          i,
          Math.sin(x * 0.14 + t * 7.2) * 1.2 +
            Math.sin(y * 0.07 + t * 5.8) * 2.8 +
            Math.cos((x + y) * 0.04 + t * 8.1) * 1.0
        );
      }
      rp.needsUpdate = true;
    }

    if (showSensors) {
      sensorMeshRefs.current.forEach((mesh, i) => {
        if (!mesh) return;
        const ph = sensorPhase[i];
        const sc = 0.82 + Math.sin(t * 3.2 + ph) * 0.28;
        mesh.scale.setScalar(sc);

        if (sensorMatRefs.current[i]) {
          sensorMatRefs.current[i].emissiveIntensity = 0.3 + Math.sin(t * 4 + ph) * 0.38;
        }

        if (sensorRingRefs.current[i]) {
          sensorRingRefs.current[i].lookAt(camera.position);
        }
        if (sensorRingMatRefs.current[i]) {
          sensorRingMatRefs.current[i].opacity = 0.18 + Math.sin(t * 2 + ph) * 0.26;
        }
        if (sensorLightRefs.current[i]) {
          sensorLightRefs.current[i].intensity = 0.12 + Math.sin(t * 3 + ph) * 0.15;
        }
      });
    }
  });

  return (
    <>
      <ambientLight color={0x5577aa} intensity={0.65} />
      <directionalLight
        color={0xfff4e0}
        intensity={2.3}
        position={[400, 500, 250]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={50}
        shadow-camera-far={2000}
        shadow-camera-left={-600}
        shadow-camera-right={600}
        shadow-camera-top={400}
        shadow-camera-bottom={-100}
        shadow-bias={-0.0004}
      />
      <hemisphereLight args={[0x88ccff, 0x445522, 0.45]} />

      <group name="dam">
        <mesh geometry={damGeometry} material={materials.conc} castShadow receiveShadow />

        {Array.from({ length: 8 }).map((_, i) => {
          const t = 0.2 + (i / 7) * 0.6;
          const th = -C.dam.arc / 2 + t * C.dam.arc;
          return (
            <mesh
              key={`pier-${i}`}
              geometry={new THREE.BoxGeometry(5, 20, C.dam.topT + 4)}
              material={materials.gate}
              position={[C.dam.R * Math.sin(th), C.dam.h + 10, C.dam.R * (Math.cos(th) - 1)]}
              rotation={[0, -th, 0]}
              castShadow
            />
          );
        })}

        <mesh
          geometry={new THREE.PlaneGeometry(550, C.dam.topT * 0.7)}
          material={materials.road}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, C.dam.h + 0.7, -20]}
          receiveShadow
        />

        <mesh
          geometry={new THREE.BoxGeometry(210, 36, 52)}
          material={materials.bldg}
          position={[0, 18, C.dam.baseT / 2 + 32]}
          castShadow
          receiveShadow
        />

        {Array.from({ length: 8 }).map((_, i) => (
          <mesh
            key={`outlet-${i}`}
            geometry={new THREE.BoxGeometry(12, 13, 8)}
            material={materials.gate}
            position={[-84 + i * 24, 10, C.dam.baseT / 2 + 60]}
          />
        ))}

        {Array.from({ length: 14 }).map((_, s) => {
          const sy = 18 + s * 6;
          const tt = sy / C.dam.h;
          const hw = C.dam.baseT / 2 + (C.dam.topT / 2 - C.dam.baseT / 2) * tt;
          return (
            <mesh
              key={`step-${s}`}
              geometry={new THREE.BoxGeometry(60, 3, 3)}
              material={materials.concL}
              position={[0, sy, hw + 1.5]}
            />
          );
        })}
      </group>

      <mesh
        geometry={terrainGeometry}
        material={materials.terr}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, TERRAIN_Y_OFFSET, 0]}
        receiveShadow
      />

      <group>
        <mesh
          ref={resWaterRef}
          geometry={resWaterGeometry}
          material={materials.water}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, C.water.resLvl, -683.5]}
        />

        <mesh
          geometry={resFillGeometry}
          material={materials.water}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, C.water.resLvl, 0]}
        />

        <mesh
          ref={rivWaterRef}
          geometry={rivGeometry}
          material={materials.watD}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, C.water.rivLvl, 620]}
        />

        <mesh
          geometry={lowRivGeometry}
          material={lowWaterMat}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -18, 640]}
        />

        <mesh
          geometry={new THREE.PlaneGeometry(140, 70, 8, 8)}
          material={materials.white}
          position={[0, 48, C.dam.baseT / 2 + 8]}
          rotation={[-0.2, 0, 0]}
        />
      </group>

      <group position={[0, TERRAIN_Y_OFFSET, 0]}>
        <mesh position={[-220, C.dam.h / 2, -310]} castShadow receiveShadow>
          <boxGeometry args={[4.8, C.dam.h + 4, 1.4]} />
          <meshStandardMaterial color={0x1f2429} roughness={0.5} metalness={0.28} />
        </mesh>

        {Array.from({ length: Math.floor(C.dam.h / 10) }).map((_, i) => {
          const y = i * 10;
          const isRed = i % 2 === 0;
          return (
            <group key={`gauge-${y}`}>
              <mesh position={[-220, y + 5, -309.98]} castShadow>
                <boxGeometry args={[3.6, 10, 1.2]} />
                <meshLambertMaterial color={isRed ? 0xcd2b31 : 0xf5f5f5} />
              </mesh>
              <mesh position={[-215.3, y, -309.1]}>
                <boxGeometry args={[5.4, 0.58, 0.58]} />
                <meshLambertMaterial color={0xe9ecef} />
              </mesh>
            </group>
          );
        })}

        <mesh position={[-215.3, C.dam.h, -309.1]}>
          <boxGeometry args={[5.4, 0.58, 0.58]} />
          <meshLambertMaterial color={0xe9ecef} />
        </mesh>

        <mesh position={[-212.5, C.water.resLvl, -308.8]}>
          <boxGeometry args={[9.8, 0.9, 0.9]} />
          <meshBasicMaterial color={0x54d2ff} />
        </mesh>

        {gaugeTexture && (
          <sprite position={[-184, C.water.resLvl + 30, -309.5]} scale={[44, 16.5, 1]}>
            <spriteMaterial map={gaugeTexture} transparent depthWrite={false} />
          </sprite>
        )}
      </group>

      <group>
        {treeInstances.map((tree, i) => (
          <group key={`tree-${i}`}>
            <mesh position={[tree.x, tree.y + 3 * tree.sc, tree.z]} scale={[tree.sc, tree.sc, tree.sc]} castShadow>
              <cylinderGeometry args={[0.7, 1.1, 6, 5]} />
              <meshLambertMaterial color={0x5c3a1e} />
            </mesh>
            <mesh position={[tree.x, tree.y + 9 * tree.sc, tree.z]} scale={[tree.sc, tree.sc, tree.sc]} castShadow>
              <coneGeometry args={[4, 10, 6]} />
              <meshLambertMaterial color={0x2a6e2a} />
            </mesh>
          </group>
        ))}
      </group>

      <group visible={showSensors}>
        {SENSOR_DEFS.map((def, i) => (
          <mesh
            key={def.n}
            ref={el => {
              sensorMeshRefs.current[i] = el;
            }}
            position={def.p}
            onClick={e => {
              e.stopPropagation();
              const source = e.sourceEvent;
              onSensorSelect({
                x: `${Math.min(source.clientX + 14, window.innerWidth - 270)}px`,
                y: `${Math.min(source.clientY + 14, window.innerHeight - 220)}px`,
                data: sensorData[i]
              });
            }}
          >
            <sphereGeometry args={[3.2, 16, 16]} />
            <meshPhongMaterial
              ref={el => {
                sensorMatRefs.current[i] = el;
              }}
              color={0x3fb950}
              emissive={0x3fb950}
              emissiveIntensity={0.5}
              transparent
              opacity={0.9}
            />

            <mesh
              ref={el => {
                sensorRingRefs.current[i] = el;
              }}
            >
              <ringGeometry args={[4.2, 6, 32]} />
              <meshBasicMaterial
                ref={el => {
                  sensorRingMatRefs.current[i] = el;
                }}
                color={0x3fb950}
                transparent
                opacity={0.32}
                side={THREE.DoubleSide}
              />
            </mesh>

            <pointLight
              ref={el => {
                sensorLightRefs.current[i] = el;
              }}
              color={0x3fb950}
              intensity={0.25}
              distance={35}
            />
          </mesh>
        ))}
      </group>

      <mesh>
        <sphereGeometry args={[2800, 32, 16]} />
        <meshBasicMaterial color={0x8ec8f8} side={THREE.BackSide} />
      </mesh>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.06}
        minDistance={80}
        maxDistance={1800}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 50, 0]}
      />
    </>
  );
}

function HydroScene({ showSensors, wireframe, waterAnim, fogOn, onSensorSelect, onPointerMissed, onSensorSummaryChange }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 55, near: 1, far: 6000, position: [380, 240, 460] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
      onPointerMissed={onPointerMissed}
    >
      <SceneContents
        showSensors={showSensors}
        wireframe={wireframe}
        waterAnim={waterAnim}
        fogOn={fogOn}
        onSensorSelect={onSensorSelect}
        onSensorSummaryChange={onSensorSummaryChange}
      />
    </Canvas>
  );
}

export default HydroScene;
