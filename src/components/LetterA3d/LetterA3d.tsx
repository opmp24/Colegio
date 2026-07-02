import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';

function LetterA() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  return (
    <Center ref={groupRef}>
      <Text3D
        font="/fonts/helvetiker_regular.typeface.json"
        size={1}
        height={0.2}
        curveSegments={12}
        bevelEnabled
        bevelThickness={0.02}
        bevelSize={0.02}
        bevelSegments={5}
      >
        A
        <meshStandardMaterial
          color="#818cf8"
          transparent
          opacity={0.35}
          metalness={0.3}
          roughness={0.4}
        />
      </Text3D>
    </Center>
  );
}

export default function LetterA3d() {
  return (
    <Canvas camera={{ position: [0, 0, 2.8], fov: 50 }} gl={{ alpha: true }}>
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <Suspense fallback={null}>
        <LetterA />
      </Suspense>
    </Canvas>
  );
}