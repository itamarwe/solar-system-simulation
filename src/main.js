import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Global variables for UI controls
let helpersVisible = true; // Helpers are visible by default
let axesHelper, gridHelper, orbitCircle;
let earthContainer; // Make earthContainer globally accessible
let cameraInfoElement; // Reference to the camera info element
let seasonLabels = []; // Array to store season labels

function init() {
  const scene = createScene();
  const camera = createCamera();
  const renderer = createRenderer(camera);
  const controls = createControls(camera, renderer);

  createStarfield(scene);

  const sun = createSun();
  earthContainer = createEarth(); // Assign to global variable

  scene.add(sun);
  scene.add(earthContainer);

  addLighting(scene, sun);

  // Add helpers to visualize the 3D space
  const helpers = addHelpers(scene);
  axesHelper = helpers.axesHelper;
  gridHelper = helpers.gridHelper;
  orbitCircle = helpers.orbitCircle;

  // Add season labels
  createSeasonLabels(scene);

  // Set up UI controls
  setupUIControls(camera, controls);

  // Initialize camera info display
  cameraInfoElement = document.getElementById('camera-info');

  // Set initial visibility of camera info to match helpers visibility
  cameraInfoElement.style.display = helpersVisible ? 'block' : 'none';

  // Update camera info display
  updateCameraInfo(camera, controls);

  animate(renderer, scene, camera, earthContainer, controls);
}

function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  return scene;
}

function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  // Position the camera to see both the sun and earth from the side
  camera.position.set(5, 5, 25);
  camera.lookAt(0, 0, 0);
  return camera;
}

function createRenderer(camera) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  return renderer;
}

function createControls(camera, renderer) {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 10;
  controls.maxDistance = 50;

  // Add event listener for camera movement
  controls.addEventListener('change', () => {
    updateCameraInfo(camera, controls);
  });

  return controls;
}

function createSun() {
  const sunGeometry = new THREE.SphereGeometry(3, 32, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xffee50
  });

  // Create the sun mesh
  const sun = new THREE.Mesh(sunGeometry, sunMaterial);
  // Place the sun on the left side
  sun.position.set(0, 0, 0);

  return sun;
}

function createEarth() {
  // Make the Earth larger for better visibility
  const earthGeometry = new THREE.SphereGeometry(2, 32, 32);

  const textureLoader = new THREE.TextureLoader();
  const earthTexture = textureLoader.load('src/textures/earth_texture.jpg');
  const earthNormalMap = textureLoader.load('src/textures/earth_normal.jpg');

  // Revert to MeshStandardMaterial as requested
  const earthMaterial = new THREE.MeshStandardMaterial({
    map: earthTexture,
    normalMap: earthNormalMap,
    metalness: 0.1,
    roughness: 0.7,
    transparent: false
  });

  const earth = new THREE.Mesh(earthGeometry, earthMaterial);
  // Set Earth to a fixed position on the right side
  earth.position.set(15, 0, 0);

  earth.castShadow = false;
  earth.receiveShadow = true;

  // Create a container for Earth to handle the tilt properly
  const earthContainer = new THREE.Object3D();
  earthContainer.position.copy(earth.position);
  earth.position.set(0, 0, 0); // Reset Earth position relative to container

  // Add Earth to the container
  earthContainer.add(earth);

  // Add rotation axis line
  addRotationAxisToEarth(earth);

  // Add a 23.5-degree tilt to the container
  earthContainer.rotation.z = THREE.MathUtils.degToRad(23.5);

  return earthContainer;
}

function addRotationAxisToEarth(earth) {
  const earthRadius = 2;
  const earthDiameter = earthRadius * 2;
  const axisLength = earthDiameter * 1.5;

  // Create a line for the rotation axis
  const axisGeometry = new THREE.BufferGeometry();
  const axisMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red color for visibility

  const points = [
    new THREE.Vector3(0, axisLength/2, 0),
    new THREE.Vector3(0, -axisLength/2, 0)
  ];

  axisGeometry.setFromPoints(points);
  const axisLine = new THREE.Line(axisGeometry, axisMaterial);

  // Apply the same rotation as the Earth to align with its tilt
  axisLine.rotation.z = THREE.MathUtils.degToRad(0);

  // Add the axis line to the Earth object so it moves with it
  earth.add(axisLine);
}

function addLighting(scene, sun) {
  // Create an omni light source at the sun's position
  const sunLight = new THREE.PointLight(0xffffff, 500, 500);
  sunLight.position.copy(sun.position);
  sunLight.castShadow = true;

  // Configure shadow properties for better quality
  sunLight.shadow.mapSize.width = 256;
  sunLight.shadow.mapSize.height = 256;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 100;

  // Add stronger ambient light for better visibility
  const ambientLight = new THREE.AmbientLight(0x444444, 0.1);

  scene.add(sunLight);
  scene.add(ambientLight);
}

function animate(renderer, scene, camera, earthContainer, controls) {
  function loop() {
    requestAnimationFrame(loop);

    // Get the Earth mesh from the container (first child)
    const earth = earthContainer.children[0];

    // Rotate the earth on its proper axis (day/night cycle)
    earth.rotation.y += 0.01;

    // Update controls
    controls.update();

    // Make season labels always face the camera
    seasonLabels.forEach(label => {
      label.lookAt(camera.position);
    });

    renderer.render(scene, camera);
  }

  loop();
}

function createStarfield(scene) {
  const starsGeometry = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1
  });

  const starsVertices = [];
  for (let i = 0; i < 5000; i++) {
    const x = THREE.MathUtils.randFloatSpread(2000);
    const y = THREE.MathUtils.randFloatSpread(2000);
    const z = THREE.MathUtils.randFloatSpread(2000);
    starsVertices.push(x, y, z);
  }

  starsGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(starsVertices, 3)
  );

  const starField = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(starField);
}

function addHelpers(scene) {
  // Add axes helper
  const axesHelper = new THREE.AxesHelper(20);
  scene.add(axesHelper);

  // Add grid helper with transparency
  const gridHelper = new THREE.GridHelper(30, 30);
  // Make grid less visible with transparency
  gridHelper.material.opacity = 0.5;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);

  // Add orbit circle to show Earth's path around the Sun
  const earthOrbitRadius = 15; // Same as Earth's distance from Sun
  const orbitGeometry = new THREE.BufferGeometry();
  const orbitMaterial = new THREE.LineBasicMaterial({
    color: 0x4488ff,
    opacity: 0.7,
    transparent: true
  });

  // Create points for the circle in the XZ plane
  const orbitPoints = [];
  const segments = 64;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const x = earthOrbitRadius * Math.cos(theta);
    const z = earthOrbitRadius * Math.sin(theta);
    orbitPoints.push(new THREE.Vector3(x, 0, z));
  }

  orbitGeometry.setFromPoints(orbitPoints);
  const orbitCircle = new THREE.Line(orbitGeometry, orbitMaterial);
  scene.add(orbitCircle);

  return { axesHelper, gridHelper, orbitCircle };
}

function createSeasonLabels(scene) {
  // Define positions for each season (same as Earth positions in the seasons)
  const positions = [
    { season: 'Summer', position: new THREE.Vector3(15, 4, 0) },
    { season: 'Autumn', position: new THREE.Vector3(0, 4, -15) },
    { season: 'Winter', position: new THREE.Vector3(-15, 4, 0) },
    { season: 'Spring', position: new THREE.Vector3(0, 4, 15) }
  ];

  // Create a canvas-based text sprite for each season
  positions.forEach(item => {
    const label = createTextSprite(item.season);
    label.position.copy(item.position);
    scene.add(label);
    seasonLabels.push(label);
  });
}

function createTextSprite(text) {
  // Create a high-resolution canvas for the text
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  // Increase canvas size for higher resolution (2x larger than before)
  canvas.width = 1024;
  canvas.height = 512;

  // Get device pixel ratio to account for high-DPI displays
  const pixelRatio = window.devicePixelRatio || 1;

  // Scale canvas for high-DPI displays
  if (pixelRatio > 1) {
    canvas.width *= pixelRatio;
    canvas.height *= pixelRatio;
    context.scale(pixelRatio, pixelRatio);
  }

  // Set canvas background to transparent
  context.fillStyle = 'rgba(0, 0, 0, 0)';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Draw text with improved quality (2x larger font)
  context.font = 'Bold 20px Arial, Helvetica, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  // Add text shadow for better visibility against any background
  context.shadowColor = 'rgba(0, 0, 0, 0.7)';
  context.shadowBlur = 14;
  context.shadowOffsetX = 4;
  context.shadowOffsetY = 4;

  // Draw text
  context.fillStyle = 'white';
  context.fillText(text, canvas.width / (2 * pixelRatio), canvas.height / (2 * pixelRatio));

  // Create texture from canvas with improved settings
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false; // Disable mipmaps for text
  texture.anisotropy = 16; // Add anisotropic filtering for sharper text at angles

  // Create sprite material with the texture
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.1 // Helps with rendering order
  });

  // Create sprite with adjusted scale
  const sprite = new THREE.Sprite(spriteMaterial);

  // Adjust scale based on canvas aspect ratio
  const aspectRatio = canvas.width / canvas.height;
  sprite.scale.set(8 * aspectRatio, 8, 1);

  return sprite;
}

function setupUIControls(camera, controls) {
  // Toggle helpers visibility
  const toggleHelpersBtn = document.getElementById('toggleHelpers');
  toggleHelpersBtn.addEventListener('click', () => {
    helpersVisible = !helpersVisible;
    axesHelper.visible = helpersVisible;
    gridHelper.visible = helpersVisible;
    orbitCircle.visible = helpersVisible;

    // Toggle season labels visibility
    seasonLabels.forEach(label => {
      label.visible = helpersVisible;
    });

    // Show/hide camera info based on helpers visibility
    cameraInfoElement.style.display = helpersVisible ? 'block' : 'none';
  });

  // Reset camera position
  const resetCameraBtn = document.getElementById('resetCamera');
  resetCameraBtn.addEventListener('click', () => {
    camera.position.set(5, 10, 25);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
    updateCameraInfo(camera, controls);
  });

  // Top view button
  const topViewBtn = document.getElementById('topView');
  topViewBtn.addEventListener('click', () => {
    camera.position.set(0, 25, 0);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
    updateCameraInfo(camera, controls);
  });

  // Season buttons
  setupSeasonButtons(camera, controls);
}

function setupSeasonButtons(camera, controls) {
  // Summer - Earth on the right side
  document.getElementById('summer').addEventListener('click', () => {
    positionEarthForSeason('summer', camera, controls);
  });

  // Autumn - Earth in front
  document.getElementById('autumn').addEventListener('click', () => {
    positionEarthForSeason('autumn', camera, controls);
  });

  // Winter - Earth on the left side
  document.getElementById('winter').addEventListener('click', () => {
    positionEarthForSeason('winter', camera, controls);
  });

  // Spring - Earth in back
  document.getElementById('spring').addEventListener('click', () => {
    positionEarthForSeason('spring', camera, controls);
  });
}

function positionEarthForSeason(season, camera, controls) {
  // Define the constant axis direction in world space (pointing up with 23.5 degree tilt)
  const axisDirection = new THREE.Vector3(0, 1, 0);
  axisDirection.applyAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(23.5));

  // Set new position based on season
  let earthX = 0, earthZ = 0;

  switch(season) {
    case 'summer':
      earthX = 15;
      earthZ = 0;
      break;
    case 'autumn':
      earthX = 0;
      earthZ = -15;
      break;
    case 'winter':
      earthX = -15;
      earthZ = 0;
      break;
    case 'spring':
      earthX = 0;
      earthZ = 15;
      break;
  }

  // Position the Earth
  earthContainer.position.set(earthX, 0, earthZ);

  // Reset rotation
  earthContainer.rotation.set(0, 0, 0);
  earthContainer.updateMatrixWorld();

  // Get the Earth mesh (first child of container)
  const earth = earthContainer.children[0];

  // Get the axis line (first child of Earth)
  let axisLine;
  for (let i = 0; i < earth.children.length; i++) {
    if (earth.children[i] instanceof THREE.Line) {
      axisLine = earth.children[i];
      break;
    }
  }

  // Apply the 23.5-degree tilt consistently for all seasons
  // This ensures the axis always points in the same direction in world space
  earthContainer.rotation.z = THREE.MathUtils.degToRad(23.5);

  // Adjust rotation based on season to maintain axis direction
  switch(season) {
    case 'summer':
      // Default position, no additional rotation needed
      break;
    case 'autumn':
      // Rotate 90 degrees around Y axis
      earthContainer.rotateY(THREE.MathUtils.degToRad(90));
      break;
    case 'winter':
      // Rotate 180 degrees around Y axis
      earthContainer.rotateY(THREE.MathUtils.degToRad(180));
      break;
    case 'spring':
      // Rotate 270 degrees around Y axis
      earthContainer.rotateY(THREE.MathUtils.degToRad(270));
      break;
  }

  // Move camera if provided
  if (camera && controls) {
    const cameraDistance = 15; // Distance from origin
    var lookAtTarget = new THREE.Vector3(7.5, 0, 0); // The point to look at

    switch(season) {
      case 'summer':
        // Camera on z=0 plane, looking at the system from the right
        camera.position.set(15, 0, cameraDistance);
        lookAtTarget.set(15, 0, 0);
        break;
      case 'autumn':
        // Camera on z=0 plane, looking at the system from the front
        camera.position.set(-cameraDistance, 0, -15);
        lookAtTarget.set(0, 0, -15);
        break;
      case 'winter':
        camera.position.set(-15, 0, cameraDistance);
        lookAtTarget.set(-15, 0, 0);
        break;
      case 'spring':
        // Camera on z=0 plane, looking at the system from the back
        camera.position.set(-cameraDistance, 0, 15);
        lookAtTarget.set(0, 0, 15);
        break;
    }

    // Set the camera to look at the specified target
    controls.target.copy(lookAtTarget);
    controls.update();

    // Update camera info display
    updateCameraInfo(camera, controls);
  }
}

// New function to update camera information display
function updateCameraInfo(camera, controls) {
  if (!cameraInfoElement) return;

  // Format position to 2 decimal places
  const posX = camera.position.x.toFixed(2);
  const posY = camera.position.y.toFixed(2);
  const posZ = camera.position.z.toFixed(2);

  // Format target to 2 decimal places
  const targetX = controls.target.x.toFixed(2);
  const targetY = controls.target.y.toFixed(2);
  const targetZ = controls.target.z.toFixed(2);

  // Format Earth position to 2 decimal places
  const earthX = earthContainer.position.x.toFixed(2);
  const earthY = earthContainer.position.y.toFixed(2);
  const earthZ = earthContainer.position.z.toFixed(2);

  // Update the display
  cameraInfoElement.innerHTML = `Camera Position: (${posX}, ${posY}, ${posZ})<br>Looking At: (${targetX}, ${targetY}, ${targetZ})<br>Earth Position: (${earthX}, ${earthY}, ${earthZ})`;
}

// Start the simulation
init();