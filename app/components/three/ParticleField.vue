<script setup lang="ts">
import * as THREE from 'three'

const canvasRef = ref<HTMLCanvasElement | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let animationId = 0
let rings: THREE.Group | null = null
let heroMesh: THREE.Mesh | null = null
let crystalMesh: THREE.Mesh | null = null
let mouseX = 0
let mouseY = 0

function buildScene(canvas: HTMLCanvasElement) {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(58, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
  camera.position.set(0, 0, 8.5)

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const ambient = new THREE.AmbientLight(0xffffff, 0.3)
  scene.add(ambient)

  const keyLight = new THREE.PointLight(0x7c3aed, 2.2, 30)
  keyLight.position.set(4, 2, 6)
  scene.add(keyLight)

  const rimLight = new THREE.PointLight(0x22d3ee, 1.4, 30)
  rimLight.position.set(-4, -2, 5)
  scene.add(rimLight)

  // Main hero mesh
  const heroGeom = new THREE.TorusKnotGeometry(1.55, 0.33, 320, 28, 2, 3)
  const heroMat = new THREE.MeshPhysicalMaterial({
    color: 0x6d28d9,
    metalness: 0.55,
    roughness: 0.14,
    transmission: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.22,
    emissive: 0x5b21b6,
    emissiveIntensity: 0.35,
  })
  heroMesh = new THREE.Mesh(heroGeom, heroMat)
  heroMesh.position.set(0, 0.15, 0)
  scene.add(heroMesh)

  // Secondary crystal
  const crystalGeom = new THREE.IcosahedronGeometry(0.82, 1)
  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: 0x22d3ee,
    metalness: 0.25,
    roughness: 0.15,
    transmission: 0.78,
    thickness: 1.1,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.2,
  })
  crystalMesh = new THREE.Mesh(crystalGeom, crystalMat)
  crystalMesh.position.set(-2.7, -0.8, -1.2)
  scene.add(crystalMesh)

  // Orbit rings
  rings = new THREE.Group()
  for (let i = 0; i < 3; i++) {
    const ringGeom = new THREE.TorusGeometry(2.35 + i * 0.33, 0.01 + i * 0.002, 8, 120)
    const ringMat = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? 0xa78bfa : 0x67e8f9,
      transparent: true,
      opacity: 0.27 - i * 0.05,
    })
    const ring = new THREE.Mesh(ringGeom, ringMat)
    ring.rotation.x = Math.PI * (0.2 + i * 0.13)
    ring.rotation.y = Math.PI * (i * 0.22)
    rings.add(ring)
  }
  scene.add(rings)
}

function animate() {
  animationId = requestAnimationFrame(animate)
  if (!renderer || !scene || !camera) return

  const t = performance.now() * 0.00045

  if (heroMesh) {
    heroMesh.rotation.x = t * 0.55
    heroMesh.rotation.y = t * 0.42
    heroMesh.position.y = 0.15 + Math.sin(t * 1.8) * 0.12
  }
  if (crystalMesh) {
    crystalMesh.rotation.x = -t * 0.44
    crystalMesh.rotation.y = t * 0.61
    crystalMesh.position.y = -0.8 + Math.sin(t * 2.3) * 0.16
  }
  if (rings) rings.rotation.z = t * 0.15

  camera.position.x += (mouseX * 0.8 - camera.position.x) * 0.03
  camera.position.y += (-mouseY * 0.35 - camera.position.y) * 0.03
  camera.lookAt(0, 0, 0)

  renderer.render(scene, camera)
}

function onMouseMove(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2
  mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2
}

function onResize() {
  const canvas = canvasRef.value
  if (!canvas || !renderer || !camera) return
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  buildScene(canvas)
  animate()
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('resize', onResize)
  renderer?.dispose()
})
</script>

<template>
  <canvas ref="canvasRef" class="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />
</template>
