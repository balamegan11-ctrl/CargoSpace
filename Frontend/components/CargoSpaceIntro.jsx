import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import portImage from '../assets/cargo_container_bg_1877x797.jpg'
import './CargoSpaceIntro.css'

const INTRO_KEY = 'cargospace-intro-seen'
const DURATION = 6300

function smoothstep(value) {
  const amount = THREE.MathUtils.clamp(value, 0, 1)
  return amount * amount * (3 - 2 * amount)
}

function addBox(parent, size, position, color, opacity = 1) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.84,
    metalness: 0.08,
    transparent: opacity < 1,
    opacity,
  })
  material.userData.baseOpacity = opacity
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function createCargoBox(parent, position, size = [0.76, 0.62, 0.64]) {
  const box = new THREE.Group()
  addBox(box, size, [0, 0, 0], '#957655')
  const seamMaterial = new THREE.MeshStandardMaterial({ color: '#4b3b2a', roughness: 0.92 })
  const [width, height, depth] = size
  for (let rib = -1; rib <= 1; rib += 1) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.022, height * 0.92, 0.018), seamMaterial)
    seam.position.set(rib * width * 0.31, 0, depth / 2 + 0.012)
    box.add(seam)
  }
  for (const level of [-0.22, 0.22]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(width * 1.01, 0.025, depth * 1.01), new THREE.MeshStandardMaterial({ color: '#bd9658', roughness: 0.65, metalness: 0.2 }))
    strap.position.y = level
    box.add(strap)
  }
  box.position.set(...position)
  parent.add(box)
  return box
}

function addRoad(parent, points, radius, color) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 64, radius, 8, false),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 }),
  )
  parent.add(mesh)
  return mesh
}

function buildScene(canvas) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  camera.position.set(-0.65, 2.55, 10.6)
  camera.lookAt(0, -0.12, 0)

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12

  scene.add(new THREE.HemisphereLight('#d9e8f5', '#132236', 2.1))
  const keyLight = new THREE.DirectionalLight('#fff0d9', 3.2)
  keyLight.position.set(-3, 7, 5)
  keyLight.castShadow = true
  scene.add(keyLight)
  const rimLight = new THREE.PointLight('#51b9ff', 22, 15)
  rimLight.position.set(4, 2, 1)
  scene.add(rimLight)

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 28),
    new THREE.MeshStandardMaterial({ color: '#081321', roughness: 0.72, metalness: 0.28 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.34
  floor.receiveShadow = true
  scene.add(floor)
  const grid = new THREE.GridHelper(28, 42, '#2d729f', '#16344c')
  grid.position.y = -1.325
  grid.material.transparent = true
  grid.material.opacity = 0.2
  scene.add(grid)

  const container = new THREE.Group()
  scene.add(container)
  const shell = '#334b5c'
  const rib = '#536a78'
  addBox(container, [6.45, 0.16, 2.66], [0, -1.1, 0], '#465d69')
  addBox(container, [6.4, 2.35, 0.13], [0, 0.08, -1.27], '#263b49')
  addBox(container, [0.14, 2.35, 2.55], [-3.15, 0.08, 0], shell)
  addBox(container, [0.14, 2.35, 2.55], [3.15, 0.08, 0], shell)
  addBox(container, [6.5, 0.12, 0.12], [0, 1.27, -1.26], rib)
  addBox(container, [6.5, 0.12, 0.12], [0, 1.27, 1.26], rib)
  for (let index = 0; index <= 16; index += 1) {
    const x = -3.06 + index * 0.3825
    addBox(container, [0.035, 2.18, 0.035], [x, 0.08, -1.18], rib)
    const z = -1.1 + index * 0.1375
    addBox(container, [0.045, 2.18, 0.045], [-3.06, 0.08, z], rib)
    addBox(container, [0.045, 2.18, 0.045], [3.06, 0.08, z], rib)
  }
  addBox(container, [0.12, 2.4, 0.12], [-3.15, 0.06, 1.26], '#8b9698')
  addBox(container, [0.12, 2.4, 0.12], [3.15, 0.06, 1.26], '#8b9698')
  addBox(container, [6.4, 0.12, 0.12], [0, 1.27, 1.26], '#8b9698')
  for (let index = 0; index <= 20; index += 1) {
    addBox(container, [0.035, 0.04, 2.48], [-3.05 + index * 0.305, -1.005, 0], '#899398')
  }

  const loaded = [
    [-2.55, -0.68, 0.55], [-1.78, -0.68, 0.55], [-1.01, -0.68, 0.55],
    [-2.55, -0.06, 0.55], [-1.78, -0.06, 0.55],
    [-2.55, -0.68, -0.2], [-1.78, -0.68, -0.2],
  ]
  loaded.forEach((position) => createCargoBox(container, position))

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 2.2),
    new THREE.MeshBasicMaterial({ color: '#30a8ff', transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
  )
  glow.rotation.x = -Math.PI / 2
  glow.position.set(1.65, -1.003, 0.12)
  container.add(glow)
  const incoming = [
    { from: [4.4, 1.2, 0.6], to: [0.75, -0.68, 0.55] },
    { from: [4.9, 1.6, -0.18], to: [1.52, -0.68, 0.55] },
    { from: [5.3, 1.15, 0.1], to: [2.3, -0.68, 0.55] },
  ].map(({ from, to }) => {
    const box = createCargoBox(scene, from, [0.66, 0.56, 0.58])
    return { box, from: new THREE.Vector3(...from), to: new THREE.Vector3(...to) }
  })

  const map = new THREE.Group()
  scene.add(map)
  const mapBase = new THREE.Mesh(
    new THREE.PlaneGeometry(8.2, 5.3),
    new THREE.MeshBasicMaterial({ color: '#0b1d2a', transparent: true, opacity: 0, side: THREE.DoubleSide }),
  )
  mapBase.rotation.x = -Math.PI / 2
  mapBase.position.y = -1.27
  map.add(mapBase)
  for (const road of [
    [[-3.6, -1.22, -1.5], [-2.1, -1.22, -0.8], [-0.8, -1.22, -1.5], [1, -1.22, -0.8], [3.7, -1.22, -1.55]],
    [[-3.7, -1.22, 0.9], [-1.6, -1.22, 1.35], [0.1, -1.22, 0.65], [1.7, -1.22, 1.3], [3.6, -1.22, 0.55]],
    [[-0.8, -1.22, -2.4], [-0.4, -1.22, -1.2], [-0.8, -1.22, 0.1], [0.25, -1.22, 1.2], [0.6, -1.22, 2.35]],
  ]) addRoad(map, road, 0.022, '#38576b')
  const route = addRoad(map, [[-2.75, -1.17, 1.2], [-1.95, -1.16, 0.8], [-0.85, -1.15, 0.18], [0.2, -1.15, -0.55], [1.35, -1.15, -0.92], [2.6, -1.15, -1.35]], 0.045, '#61c6ff')
  route.material.color.set('#75d7ff')
  const markerMaterial = new THREE.MeshBasicMaterial({ color: '#dcf5ff', transparent: true, opacity: 0 })
  for (const [x, z] of [[-2.75, 1.2], [2.6, -1.35]]) {
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), markerMaterial.clone())
    marker.position.set(x, -1.12, z)
    map.add(marker)
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.07, 0.3, 12), marker.material)
    pin.position.set(x, -1.25, z)
    map.add(pin)
  }

  // Flight lorry — a hovering cargo carrier that runs along the route
  const lorry = new THREE.Group()
  const lorryBody = addBox(lorry, [1.2, 0.34, 0.52], [0, 0, 0], '#e8f3ff')
  lorryBody.material.metalness = 0.35
  lorryBody.material.roughness = 0.32
  const lorryCockpit = addBox(lorry, [0.52, 0.24, 0.44], [-0.34, 0.14, 0], '#cfe6ff')
  lorryCockpit.material.metalness = 0.5
  lorryCockpit.material.roughness = 0.18
  const lorryCargo = addBox(lorry, [0.72, 0.3, 0.46], [0.32, 0, 0], '#9fb6c8')
  lorryCargo.material.metalness = 0.4
  lorryCargo.material.roughness = 0.4
  for (const wingX of [-0.82, 0.82]) {
    const wing = addBox(lorry, [0.16, 0.05, 0.62], [wingX, -0.14, 0], '#7fb0d6')
    wing.material.metalness = 0.5
    wing.material.roughness = 0.3
  }
  for (const engX of [-0.62, 0.62]) {
    const engine = addBox(lorry, [0.13, 0.13, 0.28], [engX, -0.06, 0.42], '#1b2a38')
    engine.material.emissive = new THREE.Color('#3aa0ff')
    engine.material.emissiveIntensity = 0.6
  }
  for (const engX of [-0.62, 0.62]) {
    const thruster = addBox(lorry, [0.1, 0.1, 0.16], [engX, -0.06, 0.54], '#7fd0ff')
    thruster.material.emissive = new THREE.Color('#7fd0ff')
    thruster.material.emissiveIntensity = 1.4
    thruster.material.transparent = true
    thruster.material.opacity = 0.85
    lorry.thrusters = lorry.thrusters || []
    lorry.thrusters.push(thruster)
  }
  lorry.position.set(-2.75, -0.95, 1.2)
  lorry.rotation.order = 'YXZ'
  map.add(lorry)
  const routePoints = [[-2.75, -1.17, 1.2], [-1.95, -1.16, 0.8], [-0.85, -1.15, 0.18], [0.2, -1.15, -0.55], [1.35, -1.15, -0.92], [2.6, -1.15, -1.35]]
    .map(([x, y, z]) => new THREE.Vector3(x, y + 0.22, z))
  const routeCurve = new THREE.CatmullRomCurve3(routePoints)
  const lorryMaterials = []
  lorry.traverse((object) => {
    if (!object.isMesh) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      material.transparent = true
      lorryMaterials.push(material)
    })
  })

  const containerMaterials = []
  container.traverse((object) => {
    if (!object.isMesh) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      if (material.userData.baseOpacity == null) material.userData.baseOpacity = material.opacity ?? 1
      material.transparent = true
      containerMaterials.push(material)
    })
  })
  const mapMaterials = []
  map.traverse((object) => {
    if (!object.isMesh) return
    object.material.transparent = true
    mapMaterials.push(object.material)
  })

  const resize = () => {
    const width = Math.max(1, canvas.clientWidth)
    const height = Math.max(1, canvas.clientHeight)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }
  resize()

  return { camera, container, containerMaterials, incoming, lorry, lorryMaterials, map, mapMaterials, renderer, resize, routeCurve, scene }
}

export default function CargoSpaceIntro() {
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const [visible, setVisible] = useState(() => sessionStorage.getItem(INTRO_KEY) !== '1' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [stage, setStage] = useState('available')
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!visible) {
      sessionStorage.setItem(INTRO_KEY, '1')
      return undefined
    }

    const canvas = canvasRef.current
    if (!canvas) return undefined

    let sceneData
    try {
      sceneData = buildScene(canvas)
    } catch {
      sessionStorage.setItem(INTRO_KEY, '1')
      const fallbackFrame = requestAnimationFrame(() => setVisible(false))
      return () => cancelAnimationFrame(fallbackFrame)
    }

    const previousOverflow = document.documentElement.style.overflow
    const previousTouchAction = canvas.style.touchAction
    document.documentElement.style.overflow = 'hidden'
    canvas.style.touchAction = 'none'
    const { camera, container, containerMaterials, incoming, lorry, lorryMaterials, map, mapMaterials, renderer, resize, routeCurve, scene } = sceneData
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    const start = performance.now()
    let frameId
    let currentStage = ''
    let closeStarted = false
    let dragging = false
    let lastPointerX = 0
    let lastPointerY = 0
    let orbitX = 0
    let orbitY = 0
    let lorryTiltX = 0
    let lorryTiltY = 0
    let targetGlowBoost = 0
    let glowBoost = 0
    let lorryProgress = 0

    const handlePointerDown = (event) => {
      dragging = true
      lastPointerX = event.clientX
      lastPointerY = event.clientY
      canvas.classList.add('is-dragging')
      canvas.setPointerCapture(event.pointerId)
      // Boost engine glow on interaction
      targetGlowBoost = 1.8
    }
    const handlePointerMove = (event) => {
      if (dragging) {
        orbitY = THREE.MathUtils.clamp(orbitY + (event.clientX - lastPointerX) * 0.006, -0.65, 0.65)
        orbitX = THREE.MathUtils.clamp(orbitX + (event.clientY - lastPointerY) * 0.004, -0.3, 0.3)
        lastPointerX = event.clientX
        lastPointerY = event.clientY
        return
      }
      const bounds = canvas.getBoundingClientRect()
      orbitY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.32
      orbitX = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.12
      // Lorry follows cursor for interactivity
      const lorryTargetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.6
      const lorryTargetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.3
      lorryTiltX = lorryTargetY
      lorryTiltY = lorryTargetX
      targetGlowBoost = 1.2
    }
    const handlePointerUp = () => {
      dragging = false
      canvas.classList.remove('is-dragging')
      targetGlowBoost = 0
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointercancel', handlePointerUp)

    const animate = (now) => {
      const elapsed = Math.min(now - start, DURATION)
      const seconds = elapsed / 1000
      const wireframeProgress = smoothstep((seconds - 2.48) / 0.92)
      const mapProgress = smoothstep((seconds - 3.6) / 1.18)
      const stageName = seconds < 2.55 ? 'available' : seconds < 3.62 ? 'wireframe' : seconds < 4.62 ? 'route' : seconds < 5.15 ? 'booking' : 'brand'

      if (stageName !== currentStage) {
        currentStage = stageName
        setStage(stageName)
      }
      if (seconds >= 5.78 && !closeStarted) {
        closeStarted = true
        setClosing(true)
      }

      camera.position.x = THREE.MathUtils.lerp(-0.65, 0, smoothstep(seconds / 2.2)) + orbitY * 0.55
      camera.position.y = THREE.MathUtils.lerp(2.55, 7.8, mapProgress) + orbitX * 0.45
      camera.position.z = THREE.MathUtils.lerp(10.6, 5.6, mapProgress)
      camera.lookAt(orbitY * 0.18, THREE.MathUtils.lerp(-0.12, -1.18, mapProgress) + orbitX * 0.08, 0)
      container.rotation.y = Math.sin(seconds * 0.48) * 0.025 + orbitY * 0.04
      container.rotation.x = THREE.MathUtils.lerp(0, -0.035, wireframeProgress)

      // Flight lorry: runs along the route during the route/booking stages
      const lorryActive = seconds >= 3.62
      const lorryTarget = lorryActive ? smoothstep((seconds - 3.62) / 2.4) : 0
      lorryProgress = THREE.MathUtils.lerp(lorryProgress, lorryTarget, 0.18)
      glowBoost = THREE.MathUtils.lerp(glowBoost, targetGlowBoost, 0.2)
      lorryTiltX = THREE.MathUtils.lerp(lorryTiltX, 0, 0.12)
      lorryTiltY = THREE.MathUtils.lerp(lorryTiltY, 0, 0.12)
      const lorryPoint = routeCurve.getPoint(THREE.MathUtils.clamp(lorryProgress, 0, 0.999))
      const lorryNext = routeCurve.getPoint(THREE.MathUtils.clamp(lorryProgress + 0.004, 0, 0.999))
      const lorryDir = new THREE.Vector3().subVectors(lorryNext, lorryPoint)
      lorryDir.y = 0
      const lorryYaw = Math.atan2(lorryDir.x, -lorryDir.z)
      const lorryHover = Math.sin(seconds * 6) * 0.02 + Math.sin(seconds * 2.3) * 0.012
      lorry.position.copy(lorryPoint)
      lorry.position.y += lorryHover
      lorry.rotation.set(lorryTiltX, lorryYaw + lorryTiltY, 0, 'YXZ')
      lorry.visible = mapProgress > 0.015 && (lorryActive || lorryProgress > 0.01)
      lorryMaterials.forEach((material) => {
        const base = material.userData.baseOpacity ?? material.opacity ?? 1
        material.opacity = base * mapProgress * (0.55 + glowBoost * 0.6)
        if (material.emissive) material.emissiveIntensity = 0.6 + glowBoost * 1.4
      })

      incoming.forEach(({ box, from, to }, index) => {
        const progress = smoothstep((seconds - 0.86 - index * 0.18) / 1.08)
        box.position.lerpVectors(from, to, progress)
        box.rotation.y = (1 - progress) * 0.18
        box.visible = seconds < 3.2
      })

      containerMaterials.forEach((material) => {
        const base = material.userData.baseOpacity ?? 1
        material.wireframe = wireframeProgress > 0.08 && mapProgress < 0.9
        material.opacity = base * (1 - mapProgress * 0.92) * (material.wireframe ? Math.max(0.18, wireframeProgress) : 1)
      })
      map.visible = mapProgress > 0.015
      mapMaterials.forEach((material) => {
        const hasOpacity = material.color?.getHex() === 0x0b1d2a
        material.opacity = mapProgress * (hasOpacity ? 0.92 : 0.9)
      })
      renderer.render(scene, camera)

      if (elapsed >= DURATION) {
        sessionStorage.setItem(INTRO_KEY, '1')
        setVisible(false)
        return
      }
      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      document.documentElement.style.overflow = previousOverflow
      canvas.style.touchAction = previousTouchAction
      canvas.classList.remove('is-dragging')
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointercancel', handlePointerUp)
      scene.traverse((object) => {
        object.geometry?.dispose()
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose())
        else object.material?.dispose()
      })
      renderer.dispose()
    }
  }, [visible])

  function skipIntro() {
    sessionStorage.setItem(INTRO_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return createPortal((
    <div className={`cargo-intro${closing ? ' cargo-intro--closing' : ''}`} style={{ '--intro-photo': `url("${portImage}")` }}>
      <canvas ref={canvasRef} className="cargo-intro__canvas" aria-hidden="true" />
      <div className="cargo-intro__vignette" aria-hidden="true" />
      <button type="button" className="cargo-intro__skip" onClick={skipIntro}>Skip intro <span aria-hidden="true">&#8594;</span></button>

      <div className={`cargo-intro__caption cargo-intro__caption--${stage}`} aria-live="polite">
        {stage === 'available' ? <><span className="cargo-intro__eyebrow">Unused capacity, made visible</span><p>{'Available Space \u2013 18 CBM'}</p></> : null}
        {stage === 'wireframe' ? <><span className="cargo-intro__eyebrow">Capacity, connected</span><p>From container to network.</p></> : null}
        {stage === 'route' ? <><span className="cargo-intro__eyebrow">A smarter way between cities</span><p>{'Chennai \u2192 Bengaluru'}</p><span className="cargo-intro__capacity">8 CBM Available</span></> : null}
        {stage === 'booking' ? <div className="cargo-intro__booking"><span className="cargo-intro__eyebrow">The space you need, on the route you need</span><button type="button" onClick={() => { skipIntro(); navigate('/containers') }}>Book Cargo Space <span aria-hidden="true">&#8594;</span></button></div> : null}
        {stage === 'brand' ? <div className="cargo-intro__brand"><p>CargoSpace</p><span>Find. Book. Ship. Smarter.</span></div> : null}
      </div>
      <div className="cargo-intro__timeline" aria-hidden="true"><span className={`is-active ${stage === 'available' ? '' : 'is-done'}`} /><span className={['wireframe', 'route', 'booking', 'brand'].includes(stage) ? 'is-active' : ''} /><span className={['route', 'booking', 'brand'].includes(stage) ? 'is-active' : ''} /><span className={['booking', 'brand'].includes(stage) ? 'is-active' : ''} /><span className={stage === 'brand' ? 'is-active' : ''} /></div>
    </div>
  ), document.body)
}