// 太陽系ビューワー - WebXR対応
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

class SolarSystemViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // XR関連
        this.controller1 = null;
        this.controller2 = null;
        this.controllerGrip1 = null;
        this.controllerGrip2 = null;
        this.controllerLights = [];
        
        // インタラクション
        this.isDragging = false;
        this.dragController = null;
        this.dragOffset = new THREE.Vector3();
        
        // 太陽系オブジェクト
        this.sun = null;
        this.planets = [];
        this.orbits = [];
        this.moon = null;
        this.sunLight = null;
        
        // アニメーション
        this.clock = new THREE.Clock();
        this.timeScale = 5; // 時間スケール（アニメーション速度調整）
        
        // スケーリング
        this.scaleGroup = null;
        this.currentScale = 1;
        this.minScale = 0.01;
        this.maxScale = 10;
        this.baseScale = 1;
        this.arScale = 0.08; // ARモード用スケール
        this.vrScale = 0.5; // VRモード用スケール
        
        this.planetData = this.getPlanetData();
        this.init();
    }
    
    getPlanetData() {
        return {
            mercury: {
                name: '水星',
                radius: 0.38,
                distance: 10,
                rotationPeriod: 59, // 日
                orbitalPeriod: 88, // 日
                eccentricity: 0.206,
                color: 0xffaa66,
                textureUrl: null
            },
            venus: {
                name: '金星',
                radius: 0.95,
                distance: 15,
                rotationPeriod: 243,
                orbitalPeriod: 225,
                eccentricity: 0.007,
                color: 0xffc649,
                textureUrl: null
            },
            earth: {
                name: '地球',
                radius: 1.0,
                distance: 20,
                rotationPeriod: 1, // 基準
                orbitalPeriod: 365,
                eccentricity: 0.017,
                color: 0x4488ff,
                textureUrl: null
            },
            mars: {
                name: '火星',
                radius: 0.53,
                distance: 25,
                rotationPeriod: 1.03,
                orbitalPeriod: 687,
                eccentricity: 0.093,
                color: 0xff6644,
                textureUrl: null
            },
            jupiter: {
                name: '木星',
                radius: 2.5,
                distance: 35,
                rotationPeriod: 0.41,
                orbitalPeriod: 4331, // 約11.9年
                eccentricity: 0.049,
                color: 0xfad5a5,
                textureUrl: null
            },
            saturn: {
                name: '土星',
                radius: 2.1,
                distance: 45,
                rotationPeriod: 0.45,
                orbitalPeriod: 10747, // 約29.5年
                eccentricity: 0.057,
                color: 0xfad5a5,
                textureUrl: null
            },
            uranus: {
                name: '天王星',
                radius: 1.6,
                distance: 55,
                rotationPeriod: 0.72,
                orbitalPeriod: 30589, // 約84年
                eccentricity: 0.046,
                color: 0x5faad3,
                textureUrl: null
            },
            neptune: {
                name: '海王星',
                radius: 1.5,
                distance: 65,
                rotationPeriod: 0.67,
                orbitalPeriod: 59800, // 約165年
                eccentricity: 0.011,
                color: 0x366896,
                textureUrl: null
            }
        };
    }
    
    init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createControls();
        this.createLights();
        this.createSolarSystem();
        this.setupXR();
        this.setupEventListeners();
        this.adjustLightingForScale(this.currentScale); // 初期ライティング設定
        this.animate();
    }
    
    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222);
        
        // スケール用グループ
        this.scaleGroup = new THREE.Group();
        this.scene.add(this.scaleGroup);
        
        // 星空背景
        this.createStarField();
    }
    
    createStarField() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1 });
        
        const starsVertices = [];
        for (let i = 0; i < 1000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = (Math.random() - 0.5) * 2000;
            starsVertices.push(x, y, z);
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);
    }
    
    createCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 30, 100);
    }
    
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        document.getElementById('container').appendChild(this.renderer.domElement);
    }
    
    createControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 500;
        this.controls.maxPolarAngle = Math.PI;
    }
    
    createLights() {
        // 太陽光（ポイントライト）
        this.sunLight = new THREE.PointLight(0xffffff, 1.5, 20);
        this.sunLight.position.set(0, 0, 0);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.scaleGroup.add(this.sunLight);
        
        // 環境光（全体を少し明るく）
        const ambientLight = new THREE.AmbientLight(0x404040, 1.0);
        this.scene.add(ambientLight);
    }
    
    createSolarSystem() {
        this.createSun();
        this.createPlanets();
        this.createOrbits();
        this.createMoon();
    }
    
    createSun() {
        const sunGeometry = new THREE.SphereGeometry(3, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffdd44
        });
        
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.sun.userData = { type: 'sun' };
        this.scaleGroup.add(this.sun);
    }
    
    createPlanets() {
        Object.keys(this.planetData).forEach((key, index) => {
            const data = this.planetData[key];
            this.createPlanet(data, index);
        });
    }
    
    createPlanet(data, index) {
        // 惑星本体
        const planetGeometry = new THREE.SphereGeometry(data.radius, 16, 16);
        const planetMaterial = new THREE.MeshLambertMaterial({ color: data.color });
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        
        planet.castShadow = true;
        planet.receiveShadow = true;
        
        // 軌道グループ（公転用）
        const orbitGroup = new THREE.Group();
        
        // 惑星位置グループ（楕円軌道用）
        const planetGroup = new THREE.Group();
        planetGroup.add(planet);
        orbitGroup.add(planetGroup);
        
        // 初期位置設定
        planetGroup.position.x = data.distance;
        
        // アニメーション用データ
        orbitGroup.userData = {
            planet: planet,
            planetGroup: planetGroup,
            data: data,
            orbitAngle: Math.random() * Math.PI * 2, // 初期角度をランダムに
            rotationSpeed: (2 * Math.PI) / (data.rotationPeriod * this.timeScale),
            orbitalSpeed: (2 * Math.PI) / (data.orbitalPeriod * this.timeScale * 0.01)
        };
        
        this.planets.push(orbitGroup);
        this.scaleGroup.add(orbitGroup);
        
        // 土星の場合はリングを追加
        if (data.name === '土星') {
            this.createSaturnRings(planetGroup);
        }
    }
    
    createOrbits() {
        Object.keys(this.planetData).forEach((key) => {
            const data = this.planetData[key];
            this.createOrbitLine(data);
        });
    }
    
    createOrbitLine(data) {
        const points = [];
        const segments = 64;
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            
            // 楕円軌道計算
            const a = data.distance; // 長半径
            const e = data.eccentricity; // 離心率
            const r = a * (1 - e * e) / (1 + e * Math.cos(angle));
            
            const x = r * Math.cos(angle);
            const z = r * Math.sin(angle);
            
            points.push(new THREE.Vector3(x, 0, z));
        }
        
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const orbitMaterial = new THREE.LineBasicMaterial({ 
            color: 0xAAAAAA,
            transparent: true,
            opacity: 0.3
        });
        
        const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
        this.orbits.push(orbitLine);
        this.scaleGroup.add(orbitLine);
    }
    
    createMoon() {
        // 地球を見つける
        const earthOrbitGroup = this.planets.find(planet => 
            planet.userData.data.name === '地球'
        );
        
        if (earthOrbitGroup) {
            // 月の作成
            const moonGeometry = new THREE.SphereGeometry(0.27, 8, 8);
            const moonMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
            const moon = new THREE.Mesh(moonGeometry, moonMaterial);
            
            moon.castShadow = true;
            moon.receiveShadow = true;
            
            // 月の軌道グループ
            const moonOrbitGroup = new THREE.Group();
            moonOrbitGroup.add(moon);
            
            // 月の初期位置（地球から距離3.84）
            moon.position.x = 3.84;
            
            // 月を地球の惑星グループに追加
            earthOrbitGroup.userData.planetGroup.add(moonOrbitGroup);
            
            // 月のアニメーションデータ
            moonOrbitGroup.userData = {
                moon: moon,
                orbitAngle: 0,
                orbitalSpeed: (2 * Math.PI) / (27.3 * this.timeScale * 0.01), // 月の公転周期27.3日
                rotationSpeed: (2 * Math.PI) / (27.3 * this.timeScale) // 月の自転周期（潮汐固定）
            };
              this.moon = moonOrbitGroup;
        }
    }
    
    createSaturnRings(saturnGroup) {
        // 土星のリング作成
        const ringInnerRadius = 2.8; // 土星の半径より少し大きく
        const ringOuterRadius = 4.2;
        const ringSegments = 64;
        
        const ringGeometry = new THREE.RingGeometry(ringInnerRadius, ringOuterRadius, ringSegments);
        const ringMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xccaa88,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const rings = new THREE.Mesh(ringGeometry, ringMaterial);
        
        // リングを水平に配置
        rings.rotation.x = Math.PI / 2;
        
        rings.castShadow = true;
        rings.receiveShadow = true;
        
        saturnGroup.add(rings);
        
        // 追加のリング層
        const ring2Geometry = new THREE.RingGeometry(ringInnerRadius + 0.3, ringOuterRadius - 0.3, ringSegments);
        const ring2Material = new THREE.MeshLambertMaterial({ 
            color: 0xddbb99,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        const rings2 = new THREE.Mesh(ring2Geometry, ring2Material);
        rings2.rotation.x = Math.PI / 2;
        rings2.position.y = 0.01; // 少しずらして重ねる
        
        saturnGroup.add(rings2);
    }
    
    setupXR() {
        // ARボタン
        const arButton = document.getElementById('arButton');
        if (arButton) {
            arButton.addEventListener('click', () => {
                if (navigator.xr) {
                    navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
                        if (supported) {
                            this.renderer.xr.getSession()?.end();
                            this.renderer.xr.getSession() || 
                            navigator.xr.requestSession('immersive-ar', {
                                requiredFeatures: ['local-floor']
                            }).then((session) => {
                                this.renderer.xr.setSession(session);
                                this.onARStart();
                            });
                        } else {
                            alert('ARモードはサポートされていません');
                        }
                    });
                } else {
                    alert('WebXRはサポートされていません');
                }
            });
        }
        
        // VRボタン
        const vrButton = document.getElementById('vrButton');
        if (vrButton) {
            vrButton.addEventListener('click', () => {
                if (navigator.xr) {
                    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
                        if (supported) {
                            this.renderer.xr.getSession()?.end();
                            this.renderer.xr.getSession() || 
                            navigator.xr.requestSession('immersive-vr', {
                                requiredFeatures: ['local-floor']
                            }).then((session) => {
                                this.renderer.xr.setSession(session);
                                this.onVRStart();
                            });
                        } else {
                            alert('VRモードはサポートされていません');
                        }
                    });
                } else {
                    alert('WebXRはサポートされていません');
                }
            });
        }
        
        this.setupControllers();
        this.setupSessionEvents();
    }
    
    setupSessionEvents() {
        // XRセッション終了時のイベントリスナー
        this.renderer.xr.addEventListener('sessionstart', () => {
            // セッション開始時の処理は各モードの開始メソッドで行う
        });
        
        this.renderer.xr.addEventListener('sessionend', () => {
            this.onXREnd();
        });
    }
    
    onARStart() {
        console.log('ARモード開始 - サイズを0.3倍に縮小');
        this.setSystemScale(this.arScale);
        this.positionSolarSystemForAR();
    }
    
    onVRStart() {
        console.log('VRモード開始 - デフォルトサイズ');
        this.setSystemScale(this.vrScale);
        this.positionSolarSystemForVR();
    }
    
    onXREnd() {
        console.log('XRモード終了 - デフォルトサイズ');
        this.setSystemScale(this.baseScale);
        this.resetSolarSystemPosition();
    }
    
    positionSolarSystemForAR() {
        // XRモード時：視点から少し手前、少し上に配置
        this.scaleGroup.position.set(0, 0.8, -1); // 目の高さより少し上、2m手前
        console.log('太陽系位置をXRモード用に調整');
    }
    
    positionSolarSystemForVR() {
        // XRモード時：視点から少し手前、少し上に配置
        this.scaleGroup.position.set(0, 0.0, -3); // 目の高さより少し上、2m手前
        console.log('太陽系位置をXRモード用に調整');
    }
    
    resetSolarSystemPosition() {
        // 通常モード時：原点に配置
        this.scaleGroup.position.set(0, 0, 0);
        console.log('太陽系位置をデフォルトに復帰');
    }
    
    setSystemScale(scale) {
        this.currentScale = scale;
        this.scaleGroup.scale.setScalar(scale);
        this.adjustLightingForScale(scale);
    }
    
    adjustLightingForScale(scale) {
        if (this.sunLight) {
            // スケールが小さくなるほど光の強度を下げて、距離を調整
            const baseIntensity = 1000;
            const baseDistance = 1000;
            
            // スケールに応じて強度と距離を調整
            this.sunLight.intensity = baseIntensity * (scale * scale); // 距離の二乗に比例
            this.sunLight.distance = baseDistance * scale;
            
            console.log(`ライト調整: scale=${scale}, intensity=${this.sunLight.intensity}, distance=${this.sunLight.distance}`);
        }
    }
    
    setupControllers() {
        const controllerModelFactory = new XRControllerModelFactory();
        
        // コントローラー1
        this.controller1 = this.renderer.xr.getController(0);
        this.controller1.addEventListener('selectstart', this.onSelectStart.bind(this));
        this.controller1.addEventListener('selectend', this.onSelectEnd.bind(this));
        this.scene.add(this.controller1);
        
        this.controllerGrip1 = this.renderer.xr.getControllerGrip(0);
        this.controllerGrip1.add(controllerModelFactory.createControllerModel(this.controllerGrip1));
        this.scene.add(this.controllerGrip1);
        
        // コントローラー2
        this.controller2 = this.renderer.xr.getController(1);
        this.controller2.addEventListener('selectstart', this.onSelectStart.bind(this));
        this.controller2.addEventListener('selectend', this.onSelectEnd.bind(this));
        this.scene.add(this.controller2);
        
        this.controllerGrip2 = this.renderer.xr.getControllerGrip(1);
        this.controllerGrip2.add(controllerModelFactory.createControllerModel(this.controllerGrip2));
        this.scene.add(this.controllerGrip2);
        
        // コントローラー専用ライト
        this.createControllerLights();
    }
    
    createControllerLights() {
        // コントローラー1用ライト
        const controllerLight1 = new THREE.PointLight(0xffffff, 0.5, 5);
        this.controllerGrip1.add(controllerLight1);
        this.controllerLights.push(controllerLight1);
        
        // コントローラー2用ライト
        const controllerLight2 = new THREE.PointLight(0xffffff, 0.5, 5);
        this.controllerGrip2.add(controllerLight2);
        this.controllerLights.push(controllerLight2);
    }
    
    onSelectStart(event) {
        const controller = event.target;
        
        // ARモード時のみ太陽のドラッグを許可
        if (this.isARMode() && this.sun) {
            const intersections = this.getIntersections(controller);
            
            if (intersections.length > 0) {
                const intersected = intersections[0].object;
                
                // 太陽を選択した場合
                if (intersected === this.sun) {
                    this.isDragging = true;
                    this.dragController = controller;
                    
                    // ドラッグ開始時のオフセットを計算
                    const controllerPosition = new THREE.Vector3();
                    controller.getWorldPosition(controllerPosition);
                    
                    const sunPosition = new THREE.Vector3();
                    this.scaleGroup.getWorldPosition(sunPosition);
                    
                    this.dragOffset.copy(sunPosition).sub(controllerPosition);
                    
                    console.log('太陽のドラッグ開始');
                }
            }
        }
    }
    
    onSelectEnd(event) {
        if (this.isDragging && event.target === this.dragController) {
            this.isDragging = false;
            this.dragController = null;
            console.log('太陽のドラッグ終了');
        }
    }
    
    getIntersections(controller) {
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        
        const raycaster = new THREE.Raycaster();
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
        
        // 太陽のみをチェック
        return raycaster.intersectObjects([this.sun]);
    }
    
    isARMode() {
        const session = this.renderer.xr.getSession();
        return session && session.mode === 'immersive-ar';
    }
    
    handleControllerInput() {
        if (this.renderer.xr.isPresenting) {
            const session = this.renderer.xr.getSession();
            if (session) {
                const inputSources = Array.from(session.inputSources);
                
                inputSources.forEach((inputSource) => {
                    if (inputSource.gamepad) {
                        const gamepad = inputSource.gamepad;
                        
                        // ジョイスティックの上下でスケーリング
                        if (gamepad.axes.length >= 2) {
                            const yAxis = gamepad.axes[3] || gamepad.axes[1]; // 右スティックまたは左スティック
                            if (Math.abs(yAxis) > 0.1) {
                                const scaleChange = yAxis * 0.005;
                                this.updateScale(-scaleChange); // 上で拡大、下で縮小
                            }
                        }
                    }
                });
            }
        }
    }
    
    handleDragging() {
        if (this.isDragging && this.dragController) {
            const controllerPosition = new THREE.Vector3();
            this.dragController.getWorldPosition(controllerPosition);
            
            // コントローラー位置 + オフセットを新しい太陽系位置とする
            const newPosition = controllerPosition.clone().add(this.dragOffset);
            this.scaleGroup.position.copy(newPosition);
        }
    }
    
    updateScale(delta) {
        this.currentScale = THREE.MathUtils.clamp(
            this.currentScale + delta,
            this.minScale,
            this.maxScale
        );
        this.scaleGroup.scale.setScalar(this.currentScale);
        this.adjustLightingForScale(this.currentScale);
    }
    
    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // キーボードでのスケール調整（テスト用）
        window.addEventListener('keydown', (event) => {
            switch(event.code) {
                case 'Equal': // +キー
                case 'NumpadAdd':
                    this.updateScale(0.1);
                    break;
                case 'Minus': // -キー
                case 'NumpadSubtract':
                    this.updateScale(-0.1);
                    break;
            }
        });
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        this.renderer.setAnimationLoop(() => {
            this.update();
            this.render();
        });
    }
    
    update() {
        const deltaTime = this.clock.getDelta();
        
        // コントローラー入力処理
        this.handleControllerInput();
        
        // ドラッグ処理
        this.handleDragging();
        
        // 太陽の自転
        if (this.sun) {
            this.sun.rotation.y += deltaTime * 0.5;
        }
        
        // 惑星のアニメーション
        this.planets.forEach((orbitGroup) => {
            const userData = orbitGroup.userData;
            const data = userData.data;
            
            // 自転
            userData.planet.rotation.y += userData.rotationSpeed * deltaTime;
            
            // 公転
            userData.orbitAngle += userData.orbitalSpeed * deltaTime;
            
            // 楕円軌道位置計算
            const a = data.distance;
            const e = data.eccentricity;
            const angle = userData.orbitAngle;
            const r = a * (1 - e * e) / (1 + e * Math.cos(angle));
            
            userData.planetGroup.position.x = r * Math.cos(angle);
            userData.planetGroup.position.z = r * Math.sin(angle);
            
            // デバッグ用（最初の惑星のみ）
            if (data.name === '水星' && Math.random() < 0.01) {
                console.log(`${data.name}: angle=${angle.toFixed(2)}, x=${userData.planetGroup.position.x.toFixed(2)}, z=${userData.planetGroup.position.z.toFixed(2)}`);
            }
        });
        
        // 月のアニメーション
        if (this.moon) {
            const moonUserData = this.moon.userData;
            
            // 月の自転
            moonUserData.moon.rotation.y += moonUserData.rotationSpeed * deltaTime;
            
            // 月の公転
            moonUserData.orbitAngle += moonUserData.orbitalSpeed * deltaTime;
            
            // 月の位置計算
            const moonDistance = 3.84;
            moonUserData.moon.position.x = moonDistance * Math.cos(moonUserData.orbitAngle);
            moonUserData.moon.position.z = moonDistance * Math.sin(moonUserData.orbitAngle);
        }
        
        // OrbitControls更新（非XRモード時のみ）
        if (!this.renderer.xr.isPresenting && this.controls) {
            this.controls.update();
        }
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    new SolarSystemViewer();
});