import * as THREE from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {LoadingBar} from "./LoadingBar";
import {GUI} from "three/examples/jsm/libs/lil-gui.module.min";

// @ts-ignore
import { Water } from 'three/addons/objects/Water.js';
// @ts-ignore
import { Sky } from 'three/addons/objects/Sky.js';
class Trailer{
    private clock = new THREE.Clock();
    private sizes = new THREE.Vector2(window.innerWidth, window.innerHeight);
    private camera = new THREE.PerspectiveCamera(75,this.sizes.x/this.sizes.y,0.1, 50);
    private scene = new THREE.Scene();
    private renderer = new THREE.WebGLRenderer({antialias:true});
    private controls = new OrbitControls(this.camera, this.renderer.domElement);
    private delta: number = 0;
    private previousTime: number = 0;


    private cube!: THREE.Mesh;
    //private model!: THREE.Group;
    private loadingBar!: LoadingBar;
    private water: Water;
    private sky: Sky;
    private sun!: THREE.Vector3;



    constructor()
    {
        this.camera.position.set(0,0,4);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        //-- Photorealistic rendering
        //this.renderer.outputEncoding = THREE.sRGBEncoding
        //this.renderer.physicallyCorrectLights = true;
        //this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        //this.renderer.toneMappingExposure = 3;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        //--


        this.environment();
        this.addShapes();
        //this.addLights();
        this.loadingBar = new LoadingBar();
        this.loadGLTF();
        document.body.appendChild(this.renderer.domElement);
        this.renderer.setAnimationLoop(this.render.bind(this));


        window.addEventListener('resize', this.resize.bind(this));
    }

    private environment(){
        // Water
        const waterGeometry = new THREE.PlaneGeometry( 10000, 10000 );

        this.water = new Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new THREE.TextureLoader().load( '/textures/waternormals.jpg', function ( texture ) {

                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

                } ),
                sunDirection: new THREE.Vector3(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: 3.7,
                fog: this.scene.fog !== undefined
            }
        );
        this.water.rotation.x = - Math.PI / 2;

        this.scene.add(this.water);

        // sky
        this.sun = new THREE.Vector3();

        this.sky = new Sky();
        this.sky.scale.setScalar( 10000 );
        this.scene.add( this.sky );

        const skyUniforms = this.sky.material.uniforms;

        skyUniforms[ 'turbidity' ].value = 10;
        skyUniforms[ 'rayleigh' ].value = 2;
        skyUniforms[ 'mieCoefficient' ].value = 0.005;
        skyUniforms[ 'mieDirectionalG' ].value = 0.8;

        const parameters = {
            elevation: 2,
            azimuth: 180
        };

        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );

        let renderTarget: any;
        const self = this;
        function updateSun() {


            const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation );
            const theta = THREE.MathUtils.degToRad( parameters.azimuth );

            self.sun.setFromSphericalCoords( 1, phi, theta );

            self.sky.material.uniforms[ 'sunPosition' ].value.copy( self.sun );
            self.water.material.uniforms[ 'sunDirection' ].value.copy( self.sun ).normalize();

            if ( renderTarget !== undefined ) renderTarget.dispose();

            renderTarget = pmremGenerator.fromScene( self.sky );

            self.scene.environment = renderTarget.texture;

        }

        updateSun();

        // GUI

        const gui = new GUI();

        const folderSky = gui.addFolder( 'Sky' );
        folderSky.add( parameters, 'elevation', -5, 90, 0.1 ).onChange( updateSun );
        folderSky.add( parameters, 'azimuth', - 180, 180, 0.1 ).onChange( updateSun );
        folderSky.open();

        const waterUniforms = this.water.material.uniforms;

        const folderWater = gui.addFolder( 'Water' );
        folderWater.add( waterUniforms.distortionScale, 'value', 0, 8, 0.1 ).name( 'distortionScale' );
        folderWater.add( waterUniforms.size, 'value', 0.1, 10, 0.1 ).name( 'size' );
        folderWater.open();

        //
    }


    private addShapes(){
        this.cube =   new THREE.Mesh(
            new THREE.BoxGeometry(),
            new THREE.MeshStandardMaterial({color: 0xff0000})
        );

        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(),
            new THREE.MeshStandardMaterial({
                side: THREE.DoubleSide,
                color: 'red'
            })
        );
        this.scene.add(this.cube, plane);
    }

    private addLights(){
        const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff,0.3);
        const ambientLight = new THREE.AmbientLight(0xffffff,0.45);
        const dirLight = new THREE.DirectionalLight();
        dirLight.position.set(0.2,1,1);
        //this.scene.add(ambient,ambientLight,dirLight);
    }

    loadGLTF(){
        const self = this;
        const loader = new GLTFLoader().setPath('/');

        loader.load(
            'second.glb',
            function (gltf){
                //self.model = gltf.scene;
                self.scene.add(gltf.scene);
                self.loadingBar.visible = false;
                self.renderer.setAnimationLoop(self.render.bind(self));
            },
            function (xhr){
                self.loadingBar.progress = xhr.loaded/xhr.total;
            },
            function (err)
            {
                console.error('Chair loading error' + err);
            }
        )
    }

    private render(){
        const elapsedTime = this.clock.getElapsedTime();
        this.delta = elapsedTime - this.previousTime;
        this.previousTime = elapsedTime;
        this.controls.update();
        this.cube.rotation.y += this.delta;
        this.water.material.uniforms[ 'time' ].value += 1.0 / 240.0;
        this.renderer.render(this.scene,this.camera);
    }

    private resize(){
        this.sizes.set(window.innerWidth,window.innerHeight);
        this.renderer.setSize(this.sizes.x, this.sizes.y);
        this.camera.aspect = this.sizes.x/this.sizes.y;
        this.camera.updateProjectionMatrix();
    }

}

export {Trailer};