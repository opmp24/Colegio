import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text3D, Center } from "@react-three/drei";
import * as THREE from "three";

const PRIMARY = "#6366f1";

function LetterA() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.008;
    }
  });

  return (
    <Center>
      <Text3D
        ref={meshRef}
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
        <meshStandardMaterial color={PRIMARY} metalness={0.4} roughness={0.3} />
      </Text3D>
    </Center>
  );
}

export default function LetterA3d() {
  return (
    <Canvas camera={{ position: [0, 0, 4.5], fov: 50 }} gl={{ antialias: true }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[8, 8, 8]} intensity={1} />
      <pointLight position={[-5, -5, 5]} intensity={0.4} color="#818cf8" />
      <LetterA />
    </Canvas>
  );
}
