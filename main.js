var cameraControls;
var domEvents;
var renderer, scene;
var camera, cenital;
var ladoCenital;
var L = 100;
var granoSuelo = 20;

var muroActual;
var origenMuro, finalMuro;

var origenSuelo;

var origenPintar;

var suelo;

var anchoMuros = 0.8, altoMuros = 10;

var materialConstruir = new THREE.MeshBasicMaterial({color: "black", wireframe: true});
var geometriaPilar = new THREE.BoxGeometry(anchoMuros, altoMuros, anchoMuros);
var indicador = new THREE.Mesh(geometriaPilar, materialConstruir);

var texturasMuros = [];
var muros = [];
var materialesMuros = [];
var materialesMurosInd = [];
var tamsMuros = [];
var murosPermitidos = [];

var texturasSuelo = [];
var baldosasSuelo = [];
var materialesSuelo = [];

var modelosPuertas = [undefined, undefined, undefined];
var caracsPuertas = [undefined, undefined, undefined];
var puerta, puertaTrampa;
var caracPuerta;
var murosPermitidosPuertas = [];

var ventana, panelAbierto;
var alturaVentana = 7;
var texturaMadera;

var options;

var pinturaColorSelector;
var sueloColorSelector;

var listeners = [];

var skyboxMats, sol;

var textureLoader, gltfLoader;

var objetos = [];
var objetoActual;
var desfaseObjetosX = []
var desfaseObjetosZ = []

var tejado;
var texturaTejado;
var minx = 1000, minz = 1000;
var maxx = -1000, maxz = -1000;

init();
setCameras();
loadMaterials();
loadScene();

function init(){
	// Configurar el canvas y el motor de render
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(new THREE.Color(0x000000));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	document.getElementById("container").appendChild(renderer.domElement);
	renderer.autoClear = false;
	renderer.domElement.setAttribute("tabIndex", "0");
	renderer.domElement.focus();

	// Instanciar una estructura de datos Escena
	scene = new THREE.Scene();

	window.addEventListener('resize', updateAspectRatio);

	var keyboard = new THREEx.KeyboardState(renderer.domElement);
	keyboard.domElement.addEventListener('keydown', function(event){
		if( keyboard.eventMatches(event, 'r') && objetoActual != undefined){
			objetoActual.rotation.y += Math.PI / 4;
		}	
	});

	const loadingManager = new THREE.LoadingManager( () => {
		const loadingScreen = document.getElementById( 'loading-screen' );
		loadingScreen.classList.add( 'fade-out' );
		
		// optional: remove loader from DOM via event listener
		loadingScreen.addEventListener( 'transitionend', function(event){event.target.remove()} );
		loadModels();
		setLights();
		setupGui();
		render();
	} );

	textureLoader = new THREE.TextureLoader(loadingManager);
	gltfLoader = new THREE.GLTFLoader(loadingManager);
}

function setLights(){
	var light = new THREE.HemisphereLight(0xFFFFFF, 0x080820, 0.5);
	scene.add(light);

	var luzAmbiente = new THREE.AmbientLight(0x333333);
	scene.add(luzAmbiente);

	sol = new THREE.DirectionalLight("white", 1);
	sol.position.set(0,200,0);
	sol.castShadow = true;
	sol.penumbra = 0.2;
	sol.name = "sol";
	scene.add(sol);
	sol.shadow.camera = new THREE.OrthographicCamera( -225, 225, 225, -225, 0.5, 400 );
}

function setCameras(){
	var aspectRatio = window.innerWidth / window.innerHeight;
	camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
	camera.position.set(0,50,75);
	camera.lookAt(new THREE.Vector3(0,0,0));
	camera.layers.enable(1);


	ladoCenital = Math.min(window.innerWidth, window.innerHeight) / 4;
	cenital = new THREE.OrthographicCamera(-L/2, L/2, L/2, -L/2, -1, 150 );
	cenital.position.set(0,100,0);
	cenital.up = new THREE.Vector3(0,0,-1);
	cenital.lookAt(new THREE.Vector3(0,0,0));

	scene.add(camera);
	scene.add(cenital);

	cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
	cameraControls.target.set(0,0,0);
	cameraControls.noKeys = true;

	domEvents = new THREEx.DomEvents(camera, renderer.domElement);
}

function loadMaterials(){
	var ind = 1;
	var complete = function(texture){
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texturasMuros.push(texture);
		if(ind == 1){
			muroMaterialDefecto = new THREE.MeshLambertMaterial({map:texture});
		}
		if(ind < 9){
			textureLoader.load("images/wall" + (ind++) + ".jpg", complete);
		}
	};
	textureLoader.load("images/wall0.jpg",	complete);

	var indS = 1
	var completeS = function(texture){
		texturasSuelo.push(texture);
		if(indS < 10){
			textureLoader.load("images/floor" + (indS++) + ".jpg", completeS);
		}
	};
	textureLoader.load("images/floor0.jpg", completeS);

	texturaMadera = textureLoader.load("./images/wood512.jpg");

	texturaTejado = textureLoader.load("images/roof.jpg");
	texturaTejado.wrapS = THREE.RepeatWrapping;
	texturaTejado.wrapT = THREE.RepeatWrapping;
}

function loadModels(){
	var t0 = performance.now();
	var gltfLoaderModels = new THREE.GLTFLoader();
	gltfLoaderModels.load(
		'models/Door1/scene.gltf',
		function ( gltf ) {
			gltf.scene.scale.set(0.04,0.04,0.04);
			modelosPuertas[0] = gltf.scene;
			caracsPuertas[0] = [4.2,0.35,0.575,Math.PI/2]
		}
	);
	gltfLoaderModels.load(
		'models/Door2/scene.gltf',
		function ( gltf ) {
			gltf.scene.scale.set(3,3,3);
			modelosPuertas[1] = gltf.scene;
			caracsPuertas[1] = [0,0.35,0.35,0]
		}
	);

	gltfLoaderModels.load(
		'models/Table/scene.gltf',
		function ( gltf ) {
			var mesa = gltf.scene;
			mesa.scale.set(0.13,0.13,0.13);
			objetos[0] = mesa;
			desfaseObjetosX[0] = -1.4;
			desfaseObjetosZ[0] = 0;
			
			mesa.traverse( function(node) {
        		if ( node instanceof THREE.Mesh ) { 
        			node.castShadow = true; 
        			node.receiveShadow = true; 
        		}
    		});
		}
	);

	gltfLoaderModels.load(
		'models/Chair/scene.gltf',
		function ( gltf ) {
			var silla = gltf.scene;
			silla.scale.set(5,5,5);
			objetos[1] = silla;
			desfaseObjetosX[1] = 0;
			desfaseObjetosZ[1] = 0;
			
			silla.traverse( function(node) {
        		if ( node instanceof THREE.Mesh ) { 
        			node.castShadow = true; 
        			node.receiveShadow = true; 
        		}
    		});
		}
	);

	gltfLoaderModels.load(
		'models/Sofa/scene.gltf',
		function ( gltf ) {
			var sofa = gltf.scene;
			sofa.scale.set(0.8,0.8,0.8);
			objetos[2] = sofa;
			desfaseObjetosX[2] = 0;
			desfaseObjetosZ[2] = 0;
			
			sofa.traverse( function(node) {
        		if ( node instanceof THREE.Mesh ) { 
        			node.castShadow = true; 
        			node.receiveShadow = true; 
        		}
    		});
		}
	);

	gltfLoaderModels.load(
		'models/LampFloor/scene.gltf',
		function ( gltf ) {
			var lamp = gltf.scene;
			lamp.scale.set(1.05,1.05,1.05);
			objetos[3] = lamp;
			desfaseObjetosX[3] = 0;
			desfaseObjetosZ[3] = 0;

			var luz = new THREE.PointLight("white", 0.55, L/2, 2);
			luz.position.set(0,6,0);
			lamp.add(luz);

			lamp.traverse( function(node) {
        		if ( node instanceof THREE.Mesh ) { 
        			node.castShadow = true; 
        			node.receiveShadow = true; 
        		}
    		});
		}
	);

	gltfLoaderModels.load(
		'models/LampCeil/scene.gltf',
		function ( gltf ) {
			var lamp = gltf.scene;
			lamp.scale.set(0.035,0.018,0.035);
			lamp.position.y = 6.8;
			objetos[4] = lamp;
			desfaseObjetosX[4] = -0.85;
			desfaseObjetosZ[4] = -0.2;

			var luz = new THREE.PointLight("white", 0.55, L/2, 2);
			luz.position.set(25,6,6);
			lamp.add(luz);
			
			lamp.traverse( function(node) {
        		if ( node instanceof THREE.Mesh ) { 
        			node.castShadow = true; 
        			node.receiveShadow = true; 
        		}
    		});
		}
	);
}

function loadScene(){
	//Material común
	var material = new THREE.MeshLambertMaterial( {color: 0x555555, side: THREE.DoubleSide} );
	var materialW = new THREE.MeshBasicMaterial( {color: 0xCCCCCC, wireframe: true, side: THREE.DoubleSide} );

	var sueloWG = new THREE.PlaneGeometry( L, L, granoSuelo, granoSuelo);
	suelo = new THREE.Mesh( sueloWG, materialW );
	suelo.layers.set(1);
	suelo.rotation.set(Math.PI / 2, 0, 0);
	scene.add(suelo);

	var paso = L / granoSuelo;
	var posX = -L/2 + paso/2;
	var posZ = L/2 - paso/2;
	for(var i = 0; i < granoSuelo; i++){
		var filaM = [];
		var fila = [];
		for(var j = 0; j < granoSuelo; j++){
			var baldosaG = new THREE.PlaneGeometry( paso, paso, 1, 1);
			var baldosa = new THREE.Mesh( baldosaG, material ); 
			baldosa.rotation.set(Math.PI / 2, 0, 0);
			baldosa.position.set(posX, 0, posZ);
			scene.add(baldosa);
			filaM.push(material);
			baldosa.receiveShadow = true;
			fila.push(baldosa);
			posX += paso;
		}
		posZ -= paso;
		posX = -L/2 + paso/2;
		baldosasSuelo.push(fila);
		materialesSuelo.push(filaM);
	}

	var roadTex = textureLoader.load("images/road.jpg");
	roadTex.wrapS = THREE.RepeatWrapping;
	roadTex.wrapT = THREE.RepeatWrapping;
	roadTex.repeat.set(1,25);
	var pos = -211.5;
	for(var i = 0; i < 4; i++){
		for(var j = 0; j < 2; j++){
			var mroad = new THREE.MeshLambertMaterial({map:roadTex});		
			var rG = new THREE.PlaneGeometry( 25, 450, 10, 10);
			var r = new THREE.Mesh( rG, mroad );
			r.rotation.set(-Math.PI / 2, 0, j*Math.PI/2);
			r.position.set(pos*(1-j), 0, pos*j);
			r.receiveShadow = true;
			scene.add(r);
		}
		pos += 141;
	}	

	var sidewalkTex = textureLoader.load("images/sidewalk.jpg");
	sidewalkTex.wrapS = THREE.RepeatWrapping;
	sidewalkTex.wrapT = THREE.RepeatWrapping;
	sidewalkTex.repeat.set(1,16);
	for(var centrox = -141; centrox <= 141; centrox += 141){
		for(var centroy = -141; centroy <= 141; centroy += 141){
			for(var j = -1; j <= 1; j+=2){
				for(var k = 0; k < 2; k++){
					if(centrox == -141 && centroy == -141 && j == 1 && k == 0){	
						var ancho = 41;
						var posX = 70.5 + centrox;
					}
					else{	
						var ancho = 8;
						var posX = (1-k)*j*54 + centrox;
					}
					var msw = new THREE.MeshLambertMaterial({map:sidewalkTex});	
					var swG = new THREE.PlaneGeometry( ancho, 116, 10, 10);
					var sw = new THREE.Mesh( swG, msw );
					sw.rotation.set(-Math.PI / 2, 0, k * Math.PI/2);
					sw.position.set(posX, 0.05, k*j*54 + centroy);
					scene.add(sw);
					sw.receiveShadow = true;
				}
			}
		}
	}

	var cespedTex = textureLoader.load("images/floor0.jpg");
	cespedTex.wrapS = THREE.RepeatWrapping;
	cespedTex.wrapT = THREE.RepeatWrapping;
	cespedTex.repeat.set(granoSuelo,granoSuelo);
	for(var centrox = -141; centrox <= 141; centrox += 141){
		for(var centroy = -141; centroy <= 141; centroy += 141){
			if(centrox != 0 || centroy != 0){
				var cw = new THREE.MeshLambertMaterial({map:cespedTex, side: THREE.DoubleSide});		
				var cG = new THREE.PlaneGeometry( 100, 100, 10, 10);
				var c = new THREE.Mesh( cG, cw );
				c.rotation.set(-Math.PI / 2, 0, 0);
				c.position.set(centrox, 0, centroy);
				c.receiveShadow = true;
				scene.add(c);
			}
		}
	}
	
	var centroTex = textureLoader.load("images/centroRoad.jpg");
	for(var x = -211.5; x <= 211.5; x+=141){
		for(var y = -211.5; y <= 211.5; y+=141){
			var mroad = new THREE.MeshLambertMaterial({map:centroTex, side: THREE.DoubleSide});		
			var rG = new THREE.PlaneGeometry( 25, 25, 5, 5);
			r = new THREE.Mesh( rG, mroad );
			r.rotation.set(-Math.PI / 2, 0, 0);
			r.position.set(x, 0.05, y);
			r.receiveShadow = true;
			scene.add(r);
		}
	}

	posX = [-1, 65	, 7.5 , 115 , -150, -119, 10  ,102.5];
	posZ = [-1, 198	, -127, -130, 141 , 0   , 141 ,0];
	despY = [-1,0,0,0,0,0,-0.5,12]
	aumentos = [-1, 0.9, 1.4, 1.2, 1, 1.2, 1.2, 1]
	reps = [-1, 8, 1, 1, 1, 1, 1, 3]
	posreps = [[102.5,12,32],[102.5,12,-32],[65,0,232],[65,0,164],[98,0,232],[98,0,164],[131,0,232],[131,0,164],[131,0,198]]
	scales = [-1, 0.6, 0.08, 2.7, 3.25, 3.5, 4.3, 0.055];
	rotations = [-1, 0, Math.PI, 0,0,Math.PI,0,Math.PI]
	completeHouse = function ( gltf, i ) {
			var casa = gltf.scene;
			casa.traverse( function(node) {
        		if ( node instanceof THREE.Mesh ) { 
        			node.castShadow = true; 
        			node.receiveShadow = true; 
        		}
    		});
	    	scene.add(casa);
	    	casa.position.set(posX[i],despY[i],posZ[i]);
	        casa.scale.set(scales[i]*aumentos[i],scales[i],scales[i]*aumentos[i]);
	        casa.rotation.y = rotations[i];
		    if(reps[i] > 1){
		    	var iniPosRep = i == 1 ? 2 : 0;
		    	for(var k = 0; k < reps[i] - 1; k++){
		    		var nuevaCasa = casa.clone();
		    		scene.add(nuevaCasa);
		    		var pos = posreps[iniPosRep + k];
	    			nuevaCasa.position.set(pos[0],pos[1],pos[2]);
		    	}
		    }
	    }
	for(var i = 1; i <= 7; i++){
		(function(auxi) {
			gltfLoader.load('models/Casa' + auxi + '/scene.gltf', function(gltf){completeHouse(gltf, auxi)})
	    })(i);
	}

	var pre = "images/TropicalSunnyDay/TropicalSunnyDay";
	var directions  = ["Left", "Right", "Up", "Down", "Front", "Back"];
	var suf = "2048.jpg";
	skyboxMats = [];
	for(var j = 0; j < directions.length; j++){
		if(j == 3){
			skyboxMats.push(new THREE.MeshBasicMaterial());
		}
		else{
			skyboxMats.push(
				new THREE.MeshBasicMaterial({
					map: textureLoader.load(pre+directions[j]+suf), 
					side: THREE.BackSide, 
					transparent: true})
			);
		}
	}
	var skyGeometry = new THREE.CubeGeometry( 448, 448, 448 );
	skybox = new THREE.Mesh( skyGeometry, skyboxMats );
	skybox.position.y = 20;
	scene.add( skybox );
}

function setupGui(){
	var currentFolder = undefined; 

	var actions = {
		Walls: function(){
			cambioModo();
			if(currentFolder != undefined)
				removeFolder(gui, currentFolder);
			currentFolder = undefined;

			domEvents.addEventListener(suelo, "mousemove", preconstruir);
			domEvents.addEventListener(suelo, "click", empezarMuro);

			listeners.push([suelo, "mousemove", preconstruir]);
			listeners.push([suelo, "click", empezarMuro]);
		},
		Doors: function(){
			cambioModo();
			if(currentFolder != undefined)
				removeFolder(gui, currentFolder);
			currentFolder = "Doors";
			var f = gui.addFolder("Doors");

			f.add(options, 'puerta', {Door1: 0, Door2: 1})
				.name("Door")
				.onChange( function(ind){
					puerta = modelosPuertas[ind].clone()
					puertaTrampa = puerta.clone();
					caracPuerta = caracsPuertas[ind];
				});
			
			puerta = modelosPuertas[options.puerta].clone()
			puertaTrampa = puerta.clone();
			caracPuerta = caracsPuertas[options.puerta];

			muros.forEach(function(muro, indx, array){
				muro.forEach(function(panel, indy, array){
					if(murosPermitidos[indx][indy] && murosPermitidosPuertas[indx][indy]){
						var prePuertaAux = function(event){prePonerPuerta(event, indx, indy);};
						var desPuertaAux = function(event){desPonerPuerta(event, indx, indy);};
						var puertaAux = function(event){ponerPuerta(event, indx, indy);};

						domEvents.addEventListener(panel, "mouseover", prePuertaAux);
						domEvents.addEventListener(panel, "mouseout", desPuertaAux);
						domEvents.addEventListener(panel, "mousedown", puertaAux);

						listeners.push([panel, "mouseover", prePuertaAux]);
						listeners.push([panel, "mouseout", desPuertaAux]);
						listeners.push([panel, "mousedown", puertaAux]);
					}
				});
			});
			f.open();
		},
		Windows: function(){
			cambioModo();
			if(currentFolder != undefined)
				removeFolder(gui, currentFolder);
			currentFolder = undefined;
			if(ventana == undefined){
				ventana = new THREE.Object3D();
				var s = L / granoSuelo;
				var alto = s - 1 - anchoMuros;
				var marcoGH = new THREE.BoxGeometry(anchoMuros/2, s, anchoMuros);
				var marcoGV = new THREE.BoxGeometry(anchoMuros/2, alto, anchoMuros);
				var materialMarco = new THREE.MeshLambertMaterial({map: texturaMadera})
				var marcoH = new THREE.Mesh(marcoGH, materialMarco);
				var marcoV = new THREE.Mesh(marcoGV, materialMarco);
				marcoH.receiveShadow = true;
				marcoH.castShadow = true;
				marcoV.receiveShadow = true;
				marcoV.castShadow = true;
				var marco1 = marcoV.clone();
				var marco2 = marcoV.clone();
				var marco3 = marcoH.clone();
				var marco4 = marcoH.clone();
				var marco5 = marcoV.clone();

				marco1.position.set(s/2 - anchoMuros/4,0,0);
				marco2.position.set(anchoMuros/4 - s/2,0,0);
				marco3.position.set(0,(s-1)/2 - anchoMuros/4,0);
				marco4.position.set(0,anchoMuros/4-(s-1)/2,0);

				marco3.rotation.set(0,0,Math.PI/2);
				marco4.rotation.set(0,0,Math.PI/2);

				ventana.add(marco1);
				ventana.add(marco2);
				ventana.add(marco3);
				ventana.add(marco4);
				ventana.add(marco5);

				var materialCristal = new THREE.MeshPhongMaterial({color: 0xFFFFFF, transparent: true, opacity: 0.3, shininess: 25, side: THREE.DoubleSide});
				var marcoCristal = new THREE.BoxGeometry(s - anchoMuros/2, alto - anchoMuros/2, 0.1);
				var cristal = new THREE.Mesh(marcoCristal, materialCristal);
				ventana.add(cristal);

				var altoVentana = L/granoSuelo - 1;
				var altoB = alturaVentana - altoVentana / 2;
				var altoT = altoMuros - alturaVentana - altoVentana / 2;
				var panelBG = new THREE.BoxGeometry(L/granoSuelo, altoB, anchoMuros);
				var panelTG = new THREE.BoxGeometry(L/granoSuelo, altoT, anchoMuros);
				var panelB = new THREE.Mesh( panelBG, muroMaterialDefecto );
				var panelT = new THREE.Mesh( panelTG, muroMaterialDefecto );
				panelB.position.y = -(altoMuros-altoB) / 2;
				panelT.position.y = (altoMuros-altoT) / 2;
				panelB.receiveShadow = true;
				panelB.castShadow = true;
				panelT.receiveShadow = true;
				panelT.castShadow = true;

				panelAbierto = new THREE.Object3D();
				panelAbierto.add(panelB);
				panelAbierto.add(panelT);
			}

			muros.forEach(function(muro, indx, array){
				muro.forEach(function(panel, indy, array){
					if(murosPermitidos[indx][indy] && murosPermitidosPuertas[indx][indy]){
						var preVentanaAux = function(event){prePonerVentana(event, indx, indy);};
						var desVentanaAux = function(event){desPonerVentana(event, indx, indy);};
						var ventanaAux = function(event){ponerVentana(event, indx, indy);};

						domEvents.addEventListener(panel, "mouseover", preVentanaAux);
						domEvents.addEventListener(panel, "mouseout", desVentanaAux);
						domEvents.addEventListener(panel, "mousedown", ventanaAux);

						listeners.push([panel, "mouseover", preVentanaAux]);
						listeners.push([panel, "mouseout", desVentanaAux]);
						listeners.push([panel, "mousedown", ventanaAux]);
					}
				});
			});
		},
		Paint: function(){
			cambioModo();
			if(currentFolder != undefined)
				removeFolder(gui, currentFolder);
			currentFolder = "Paint";
			var f = gui.addFolder("Paint");
			f.add(options, 'pintura', {Exterior1: 1, Exterior2: 2, Exterior3: 3, Exterior4: 4, Interior5: 5, Interior6: 6, Interior7: 7, Interior8: 8, Color: 9})
				.name("Paint")
				.onChange( function(ind){
					if(ind == 9){
						pinturaColorSelector = f.addColor(options, 'color').name("Color");
					}
					else if(pinturaColorSelector != undefined){
						f.remove(pinturaColorSelector);
						pinturaColorSelector = undefined;
					}
				} );
			muros.forEach(function(muro, indx, array){
				muro.forEach(function(panel, indy, array){
					var panels = []
					if(murosPermitidos[indx][indy]){
						panels = [panel]
					}
					else{
						panels = panel.children;
					}
					for(var i = 0; i < panels.length; i++){
						var prePintarAux = function(event){ prePintarMuro(event, indx, indy);};
						var desPintarAux = function(event){desPintarMuro(event, indx, indy);};
						var empezarPintarAux = function(event){empezarPintarMuro(event, indx, indy);};

						domEvents.addEventListener(panels[i], "mouseover", prePintarAux);
						domEvents.addEventListener(panels[i], "mouseout", desPintarAux);
						domEvents.addEventListener(panels[i], "mousedown", empezarPintarAux);

						listeners.push([panels[i], "mouseover", prePintarAux]);
						listeners.push([panels[i], "mouseout", desPintarAux]);
						listeners.push([panels[i], "mousedown", empezarPintarAux]);
					}
				});
			});
			if(options.pintura == 9){
				pinturaColorSelector = f.addColor(options, 'color').name("Color");
			}
			f.open();
		},
		Floor: function(){
			cambioModo();
			if(currentFolder != undefined)
				removeFolder(gui, currentFolder);
			currentFolder = "Floor";
			var f = gui.addFolder("Floor");
			f.add(options, 'suelo', {Grass: 0, Exterior1: 1, Exterior2: 2, Exterior3: 3, Exterior4: 4, Interior5: 5, Interior6: 6, Interior7: 7, Interior8: 8, Interior9: 9, Color: 10})
				.name("Floor")
				.onChange( function(ind){
					if(ind == 10){
						sueloColorSelector = f.addColor(options, 'colorSuelo').name("Color");
					}
					else if(sueloColorSelector != undefined){
						f.remove(sueloColorSelector);
						sueloColorSelector = undefined;
					}
				} );
			baldosasSuelo.forEach(function(baldosaFila, indx, array){
				baldosaFila.forEach(function(baldosa, indy, array){
					domEvents.addEventListener(baldosa, "mouseover", prePonerSuelo);
					domEvents.addEventListener(baldosa, "mouseout", desPonerSuelo);
					domEvents.addEventListener(baldosa, "mousedown", empezarSuelo);

					listeners.push([baldosa, "mouseover", prePonerSuelo]);
					listeners.push([baldosa, "mouseout", desPonerSuelo]);
					listeners.push([baldosa, "mousedown", empezarSuelo]);
				});
			});
			if(options.suelo == 10){
				sueloColorSelector = f.addColor(options, 'colorSuelo').name("Color");
			}
			f.open();

		},
		Decorate: function(){
			cambioModo();
			if(currentFolder != undefined)
				removeFolder(gui, currentFolder);
			currentFolder = "Decorate";
			var f = gui.addFolder("Decorate");
			f.add(options, 'objetos', {Table: 0, Chair: 1, Sofa: 2, Floor_Lamp: 3, Ceiling_Lamp: 4})
				.name("Furniture")
				.onChange( function(ind){
					if(objetoActual != undefined) scene.remove(objetoActual);
					objetoActual = objetos[ind];
					scene.add(objetoActual);
					renderer.domElement.focus();
				} );
			baldosasSuelo.forEach(function(baldosaFila, indx, array){
				baldosaFila.forEach(function(baldosa, indy, array){
					domEvents.addEventListener(baldosa, "mouseover", prePonerObjeto);
					domEvents.addEventListener(baldosa, "mousedown", ponerObjeto);

					listeners.push([baldosa, "mouseover", prePonerObjeto]);
					listeners.push([baldosa, "mousedown", ponerObjeto]);
				});
			});
			objetoActual = objetos[options.objetos];
			scene.add(objetoActual);
			f.open();
			renderer.domElement.focus();
		}
	};

	options = {
		pintura: "1",
		color: "rgb(255,255,255)",
		suelo: "0",
		colorSuelo: "rgb(255,255,255)",
		puerta: "0",
		hora: 12,
		objetos: "0",
		ponerTejado: function(){
			if(tejado == undefined){
				// Instancia de Geometry
				var malla = new THREE.Geometry();

				// Construir la lista de coordenadas y colores por vértice (8)
				var ajuste = 1;
				var distC = (maxx-minx)/5;
				var coordenadas = [ minx-ajuste,  altoMuros, minz-ajuste,
									minx-ajuste,  altoMuros, maxz+ajuste,
									maxx+ajuste,  altoMuros, maxz+ajuste,
									maxx+ajuste,  altoMuros, minz-ajuste,
									minx+distC,  2*altoMuros, (minz+maxz)/2,
									maxx-distC,  2*altoMuros, (minz+maxz)/2];

				// Triángulos por vértices en el sentido antihorario
				var indices = [ 
								1,2,4,//frente
								2,5,4,//frente
								2,3,5,//derecha
								1,4,0,//izquierda
								0,5,4,//detras
								0,3,5//detras
								];

				// Construye vértices y los inserta en la malla
				for(var i = 0; i < coordenadas.length; i += 3){
					var vertice = new THREE.Vector3(coordenadas[i], coordenadas[i + 1], coordenadas[i + 2]);
					malla.vertices.push(vertice);
				}

				// Construir las caras(triángulos) y los inserta en la malla
				for(var i = 0; i < indices.length; i += 3){
					// Cada media cara es un triángulo
					var triangulo = new THREE.Face3(indices[i], indices[i + 1], indices[i + 2]);
					malla.faces.push(triangulo);
				}

				malla.computeVertexNormals();
				malla.faceVertexUvs[0].push([new THREE.Vector2(1, 0),new THREE.Vector2(0, 0),new THREE.Vector2(4/5, 1)]);
				malla.faceVertexUvs[0].push([new THREE.Vector2(0, 0),new THREE.Vector2(1/5, 1),new THREE.Vector2(1, 1)]);
				malla.faceVertexUvs[0].push([new THREE.Vector2(1, 0),new THREE.Vector2(0, 0),new THREE.Vector2(0.5, 1)]);
				malla.faceVertexUvs[0].push([new THREE.Vector2(1, 0),new THREE.Vector2(0.5, 1),new THREE.Vector2(0, 0)]);
				malla.faceVertexUvs[0].push([new THREE.Vector2(0, 0),new THREE.Vector2(4/5, 1),new THREE.Vector2(1/5, 1)]);
				malla.faceVertexUvs[0].push([new THREE.Vector2(0, 0),new THREE.Vector2(1,0),new THREE.Vector2(4/5, 1)]);
				malla.uvsNeedUpdate = true;

				texturaTejado.needsUpdate = true;
				texturaTejado.repeat.set((maxx - minx) / (2*altoMuros), (maxz - minz) / (2*altoMuros));
				var tM = new THREE.MeshLambertMaterial({map:texturaTejado, side: THREE.DoubleSide});	

				tejado = new THREE.Mesh(malla, tM);
				tejado.traverse( function(node) {
	        		if ( node instanceof THREE.Mesh ) { 
	        			node.castShadow = true; 
	        			node.receiveShadow = false; 
	        		}
	    		});
				scene.add(tejado);
			}
			else{
				scene.remove(tejado);
				tejado = undefined;
			}
		},
	}

	var gui = new dat.GUI();
	gui.add(actions, 'Walls');
	gui.add(actions, 'Doors');
	gui.add(actions, 'Windows');
	gui.add(actions, 'Paint');
	gui.add(actions, 'Floor');
	gui.add(actions, 'Decorate');

	var common = gui.addFolder("General");
	common.add(options, "hora", 0, 24, 1).name("Hour of the day").onChange( function(h){
		cambiarHora(h);
	});
	common.add(options, "ponerTejado").name("Show/Hide ceiling");
	common.open();
}

function cambiarHora(h){
	var int = Math.max(0, -0.02041*h*h+0.5714*h-3)
	for(var i = 0; i < skyboxMats.length; i++){
		skyboxMats[i].opacity = int;
	}
	var x = 200*((14-h)/7);
	var y = Math.sqrt(40000 - x * x);
	sol.position.set(x,y,0);
	sol.intensity = int;
	var color = new THREE.Color(1, 0.5*int+0.5, int);
	sol.color = color;
}

function cambioModo(){
	eliminarListeners();
	scene.remove(indicador);
	if(muroActual != undefined){
		scene.remove(muroActual);
		muroActual = undefined;
	}

	if(origenSuelo != undefined){
		limpiarSuelo(undefined);
		origenSuelo = undefined;
	}

	if(origenPintar != undefined){
		limpiarParedes(undefined);
		origenPintar = undefined;
	}

	if(objetoActual != undefined){
		scene.remove(objetoActual);
		objetoActual = undefined;
	}

	if(puerta != undefined){
		scene.remove(puerta);
		scene.remove(puertaTrampa);
		puerta = undefined;
		puertaTrampa = undefined;
	}
}

function eliminarListeners(){
	for(var i = 0; i < listeners.length; i++){
		var l = listeners[i];
		domEvents.removeEventListener(l[0], l[1], l[2]);
	}
	listeners = [];
}

function render(time){
	// Encolarse a sí misma
	requestAnimationFrame(render);

	update(time);

	renderer.clear();

	// Dibujar el frame
	renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
	renderer.render(scene, camera);

	renderer.setViewport(0, 0, ladoCenital, ladoCenital);
	renderer.render(scene, cenital);
}

function update(time){
	cameraControls.update();
	TWEEN.update(time);
}

function updateAspectRatio(){
	//Renovar las dimensiones del viewport y la matriz de proyeccion
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	ladoCenital = Math.min(window.innerWidth, window.innerHeight) / 4;
}

//Construcción

function preconstruir(event){
	indicador.position.set(roundPos(event.intersect.point.x), altoMuros/2, roundPos(event.intersect.point.z));
	scene.add(indicador);
}

function empezarMuro(event){
	if(muroActual == undefined){
		scene.remove(indicador);

		eliminarListeners();

		domEvents.addEventListener(suelo, "click", empezarMuro);
		domEvents.addEventListener(suelo, "mousemove", construyendoMuro);
		domEvents.addEventListener(suelo, "mousedown", cancelarMuro);

		listeners.push([suelo, "click", empezarMuro]);
		listeners.push([suelo, "mousemove", construyendoMuro]);
		listeners.push([suelo, "mousedown", cancelarMuro]);
	}
	else{
		finalMuro = [roundPos(event.intersect.point.x), roundPos(event.intersect.point.z)];

		minx = Math.min(minx, origenMuro[0]);
		minz = Math.min(minz, origenMuro[1]);
		maxx = Math.max(maxx, origenMuro[0]);
		maxz = Math.max(maxz, origenMuro[1]);
		minx = Math.min(minx, finalMuro[0]);
		minz = Math.min(minz, finalMuro[1]);
		maxx = Math.max(maxx, finalMuro[0]);
		maxz = Math.max(maxz, finalMuro[1]);

		var d = Math.sqrt((origenMuro[0]-finalMuro[0])*(origenMuro[0]-finalMuro[0]) + (origenMuro[1]-finalMuro[1])*(origenMuro[1]-finalMuro[1]));
		if(origenMuro[0] == finalMuro[0] || origenMuro[1] == finalMuro[1]) d += anchoMuros - 0.01;
		
		var mats = [];
		var murs = [];
		var tam = d/Math.round(d * granoSuelo / L);
		tamsMuros.push(tam);
		var iniX, iniZ, angulo;
		var ajuste = (origenMuro[0] == finalMuro[0] || origenMuro[1] == finalMuro[1]) ? anchoMuros/2 + 0.005 : 0;
		var derecho = true;
		if(origenMuro[0] == finalMuro[0]){
			angulo = -Math.PI / 2;
			if(origenMuro[1] < finalMuro[1]){
				iniX = origenMuro[0];
				iniZ = origenMuro[1] - ajuste;
			}
			else{
				iniX = finalMuro[0];
				iniZ = finalMuro[1] - ajuste;
				derecho = false;
			}
		}
		else {
			angulo = -Math.atan((finalMuro[1]-origenMuro[1])/(finalMuro[0]-origenMuro[0]));
			if(origenMuro[0] < finalMuro[0]){
				iniX = origenMuro[0] - ajuste;
				iniZ = origenMuro[1];
			}
			else{
				iniX = finalMuro[0] - ajuste;
				iniZ = finalMuro[1];
				derecho = false;
			}
		}
		iniX += tam * Math.cos(angulo)/2;
		iniZ -= tam * Math.sin(angulo)/2;
		var nuevoMuro = [];
		var muroMateriales = [];
		var muroMaterialesInd = [];
		var muroPermitido = [];
		for(var i = 0; i < d/tam; i++){
			muroPermitido.push(true);
			var muroG = new THREE.BoxGeometry(tam, altoMuros, anchoMuros);
			var fragmento = new THREE.Mesh( muroG, materialConstruir );
			fragmento.position.set( iniX, altoMuros/2, iniZ );
			fragmento.rotation.set(0,angulo,0);
			iniX += tam * Math.cos(angulo);
			iniZ -= tam * Math.sin(angulo);

			muroMateriales.push([muroMaterialDefecto,muroMaterialDefecto,muroMaterialDefecto,muroMaterialDefecto,muroMaterialDefecto,muroMaterialDefecto]);
			muroMaterialesInd.push([0,0,0,0,0,0]);
			var fragmentoReal = fragmento.clone();
			fragmentoReal.castShadow = true;
			fragmentoReal.receiveShadow = true;
			fragmentoReal.material = muroMaterialDefecto;
			scene.add(fragmentoReal);
			nuevoMuro.push(fragmentoReal);
			fragmentoReal.position.y = -altoMuros/2 - 0.1;
			new TWEEN.Tween(fragmentoReal.position)
				.to({y: altoMuros/2}, 500)
				.delay(derecho ? 80 * i : 80 * (d / tam - i))
				.easing(TWEEN.Easing.Elastic.Out)
				.start();
		}
		murosPermitidos.push(muroPermitido);
		murosPermitidosPuertas.push(muroPermitido.slice(0));
		muros.push(nuevoMuro);
		materialesMuros.push(muroMateriales);
		materialesMurosInd.push(muroMaterialesInd);
		scene.remove(muroActual);
	}

	origenMuro = [roundPos(event.intersect.point.x), roundPos(event.intersect.point.z)];
	muroActual = new THREE.Mesh(geometriaPilar, materialConstruir);
	muroActual.position.set(origenMuro[0], altoMuros/2, origenMuro[1]);
	scene.add(muroActual);
}

function construyendoMuro(event){
	scene.remove(muroActual);

	finalMuro = [roundPos(event.intersect.point.x), roundPos(event.intersect.point.z)];
	var d = Math.sqrt((origenMuro[0]-finalMuro[0])*(origenMuro[0]-finalMuro[0]) + (origenMuro[1]-finalMuro[1])*(origenMuro[1]-finalMuro[1]));
	if(d == 0) d = anchoMuros;
	var muroG = new THREE.BoxGeometry(d, altoMuros, anchoMuros);

	muroActual = new THREE.Mesh( muroG, materialConstruir );

	muroActual.position.set((origenMuro[0]+finalMuro[0])/2, altoMuros/2, (origenMuro[1]+finalMuro[1])/2);

	var dir = Math.PI / 2;
	if(finalMuro[0]-origenMuro[0] != 0)
		dir = Math.atan((finalMuro[1]-origenMuro[1])/(finalMuro[0]-origenMuro[0]));
	muroActual.rotation.set(0,-dir,0);

	scene.add(muroActual);
}

function cancelarMuro(event){
	if(event.origDomEvent.which == 3){
		scene.remove(muroActual);
		muroActual = undefined;

		eliminarListeners();

		domEvents.addEventListener(suelo, "mousemove", preconstruir);
		domEvents.addEventListener(suelo, "click", empezarMuro);

		listeners.push([suelo, "mousemove", preconstruir]);
		listeners.push([suelo, "click", empezarMuro]);
	}
}

function roundPos(x){
	var aux = L / granoSuelo;
	return aux * Math.round(x/aux);
}

// Pintura

function prePintarMuro(event, indx, indy){
	if(options.pintura > 0){
		var muro = event.target;
		var cara = event.intersect.face.materialIndex;
		var muroNormal = murosPermitidos[indx][indy];

		if(muroNormal){
			var material;
			if(options.pintura == 9){
				material = new THREE.MeshLambertMaterial( {color: options.color, side: THREE.DoubleSide} );
			}
			else{
				var t = texturasMuros[options.pintura].clone();
				t.needsUpdate = true;
				var ancho = muro.geometry.parameters.width;
				t.repeat.set(ancho/altoMuros,1);
				material = new THREE.MeshLambertMaterial({map:t});
			}
			var materialesProvisionales = materialesMuros[indx][indy].slice(0);
			materialesProvisionales[cara] = material;
			muro.material = materialesProvisionales;
		}
		else{
			var subPanel1 = muros[indx][indy].children[0];
			var subPanel2 = muros[indx][indy].children[1];
			var alto1 = subPanel1.geometry.parameters.height;
			var alto2 = subPanel2.geometry.parameters.height;
			var material1, material2;
			if(options.pintura == 9){
				material1 = new THREE.MeshLambertMaterial( {color: options.color, side: THREE.DoubleSide} );
				material2 = material1.clone()
			}
			else{
				var ancho = muro.geometry.parameters.width;
				var t1 = texturasMuros[options.pintura].clone();
				t1.needsUpdate = true;
				var t2 = t1.clone()
				t2.needsUpdate = true;
				t1.repeat.set(ancho/altoMuros,alto1/altoMuros);
				t2.repeat.set(ancho/altoMuros,alto2/altoMuros);
				t2.offset.y = (altoMuros - alto2) / altoMuros;
				material1 = new THREE.MeshLambertMaterial({map:t1});
				material2 = new THREE.MeshLambertMaterial({map:t2});
			}
			var materialesProvisionales1 = materialesMuros[indx][indy][0].slice(0);
			var materialesProvisionales2 = materialesMuros[indx][indy][1].slice(0);
			materialesProvisionales1[cara] = material1;
			materialesProvisionales2[cara] = material2;
			subPanel1.material = materialesProvisionales1;
			subPanel2.material = materialesProvisionales2;
		}
	}
}

function desPintarMuro(event, indx, indy){
	var muroNormal = murosPermitidos[indx][indy];
	if(muroNormal)
		event.target.material = materialesMuros[indx][indy];
	else{
		var subPanel1 = muros[indx][indy].children[0];
		var subPanel2 = muros[indx][indy].children[1];
		subPanel1.material = materialesMuros[indx][indy][0];
		subPanel2.material = materialesMuros[indx][indy][1];
	}
}

function empezarPintarMuro(event, indx, indy){
	if(options.pintura > 0){
		origenPintar = [indx, indy];

		eliminarListeners();
		muros[indx].forEach(function(panel, ind, array){
			panels = [];
			if(murosPermitidos[indx][ind])
				panels = [panel]
			else
				panels = panel.children;
			for(var i = 0; i < panels.length; i++){
				var pintandoAux = function(event){pintandoMuro(event, ind);};
				var terminarPintarAux = function(event){terminarPintarMuro(event, ind);};

				domEvents.addEventListener(panels[i], "mouseover", pintandoAux);
				domEvents.addEventListener(panels[i], "mousedown", terminarPintarAux);

				listeners.push([panels[i], "mouseover", pintandoAux]);
				listeners.push([panels[i], "mousedown", terminarPintarAux]);
			}
		});
	}
}

function pintandoMuro(event, ind){
	if(options.pintura > 0){
		var muroContenedor = muros[origenPintar[0]];
		var min = Math.min(ind, origenPintar[1]);
		var max = Math.max(ind, origenPintar[1]);
		var indx = origenPintar[0];

		var cara = event.intersect.face.materialIndex;

		var material;
		var ancho = event.target.geometry.parameters.width;
		if(options.pintura == 9){
			material = new THREE.MeshLambertMaterial( {color: options.color, side: THREE.DoubleSide} );
		}
		else{
			var t = texturasMuros[options.pintura].clone();
			t.needsUpdate = true;
			t.repeat.set(ancho/altoMuros,1);
			material = new THREE.MeshLambertMaterial({map:t});
		}

		for(var i = 0; i < muroContenedor.length; i++){
			if(i >= min && i <= max){
				if(murosPermitidos[origenPintar[0]][i]){
					var materialesProvisionales = materialesMuros[indx][i].slice(0);
					materialesProvisionales[cara] = material;
					muroContenedor[i].material = materialesProvisionales;
				}
				else{
					var material1, material2;
					var frag1 = muroContenedor[i].children[0];
					var frag2 = muroContenedor[i].children[1];
					if(options.pintura == 9){
						material1 = material.clone();
						material2 = material.clone();
					}
					else{
						var alto1 = frag1.geometry.parameters.height;
						var alto2 = frag2.geometry.parameters.height;
						var t1 = texturasMuros[options.pintura].clone();
						t1.needsUpdate = true;
						var t2 = t1.clone()
						t2.needsUpdate = true;
						t1.repeat.set(ancho/altoMuros,alto1/altoMuros);
						t2.repeat.set(ancho/altoMuros,alto2/altoMuros);
						t2.offset.y = (altoMuros - alto2) / altoMuros;
						material1 = new THREE.MeshLambertMaterial({map:t1});
						material2 = new THREE.MeshLambertMaterial({map:t2});
					}
					var materialesProvisionales1 = materialesMuros[indx][i][0].slice(0);
					var materialesProvisionales2 = materialesMuros[indx][i][1].slice(0);
					materialesProvisionales1[cara] = material1;
					materialesProvisionales2[cara] = material2;
					frag1.material = materialesProvisionales1;
					frag2.material = materialesProvisionales2;
				}
			}
			else{
				if(murosPermitidos[origenPintar[0]][i]){
					muroContenedor[i].material = materialesMuros[origenPintar[0]][i];
				}
				else{
					muroContenedor[i].children[0].material = materialesMuros[origenPintar[0]][i][0];
					muroContenedor[i].children[1].material = materialesMuros[origenPintar[0]][i][1];
				}
			}
		}
	}
}

function terminarPintarMuro(event, ind){
	if(event != undefined && event.origDomEvent.which == 1){
		var min = Math.min(ind, origenPintar[1]);
		var max = Math.max(ind, origenPintar[1]);
		var cara = event.intersect.face.materialIndex;
		var indx = origenPintar[0];

		var muroContenedor = muros[origenPintar[0]];
		for(var i = min; i <= max; i++){
			if(murosPermitidos[indx][i]){
				materialesMuros[indx][i] = muroContenedor[i].material;
			}
			else{
				materialesMuros[indx][i] = [muroContenedor[i].children[0].material, muroContenedor[i].children[1].material];
			}
			materialesMurosInd[indx][i][cara] = options.pintura;
		}
	}
	else{
		limpiarParedes();
	}
	origenPintar = undefined;
	eliminarListeners();

	muros.forEach(function(muro, indx, array){
		muro.forEach(function(panel, indy, array){
			var panels = []
			if(murosPermitidos[indx][indy]){
				panels = [panel]
			}
			else{
				panels = panel.children;
			}
			for(var i = 0; i < panels.length; i++){
				var prePintarAux = function(event){ prePintarMuro(event, indx, indy);};
				var desPintarAux = function(event){desPintarMuro(event, indx, indy);};
				var empezarPintarAux = function(event){empezarPintarMuro(event, indx, indy);};

				domEvents.addEventListener(panels[i], "mouseover", prePintarAux);
				domEvents.addEventListener(panels[i], "mouseout", desPintarAux);
				domEvents.addEventListener(panels[i], "mousedown", empezarPintarAux);

				listeners.push([panels[i], "mouseover", prePintarAux]);
				listeners.push([panels[i], "mouseout", desPintarAux]);
				listeners.push([panels[i], "mousedown", empezarPintarAux]);
			}
		});
	});
}

function limpiarParedes(){
	var indx = origenPintar[0];
	var muroContenedor = muros[indx];
	for(var i = 0; i < muroContenedor.length; i++){
		if(murosPermitidos[indx][i])
			muroContenedor[i].material = materialesMuros[indx][i];
		else{
			muroContenedor[i].children[0].material = materialesMuros[indx][i][0];
			muroContenedor[i].children[1].material = materialesMuros[indx][i][1];
		}
	}
}

// Suelo

function prePonerSuelo(event){
	if(typeof(options.suelo) == "string" && options.suelo >= 0){
		var baldosa = event.target;

		var material;
		if(options.suelo == 10){
			material = new THREE.MeshLambertMaterial( {color: options.colorSuelo, side: THREE.DoubleSide} );
		}
		else{
			var t = texturasSuelo[options.suelo].clone();
			t.needsUpdate = true;
			material = new THREE.MeshLambertMaterial({map:t, side: THREE.DoubleSide});
		}
		event.target.material = material;
	}
}

function desPonerSuelo(event){
	var w = L / granoSuelo; 
	var lim = L/2 - (w / 2);
	var x1 = (event.target.position.x + lim) / w;
	var z1 = (event.target.position.z - lim) / -w;
	event.target.material = materialesSuelo[z1][x1];
}

function empezarSuelo(event){
	if(typeof(options.suelo) == "string" && options.suelo >= 0){
		origenSuelo = event.target;

		eliminarListeners();
		baldosasSuelo.forEach(function(baldosaFila, indx, array){
			baldosaFila.forEach(function(baldosa, indy, array){
				domEvents.addEventListener(baldosa, "mouseover", poniendoSuelo);
				domEvents.addEventListener(baldosa, "mousedown", terminarSuelo);

				listeners.push([baldosa, "mouseover", poniendoSuelo]);
				listeners.push([baldosa, "mousedown", terminarSuelo]);
			});
		});
	}
}

function poniendoSuelo(event){
	limpiarSuelo();
	if(typeof(options.suelo) == "string" && options.suelo >= 0){
		var baldosa = event.target;

		var material;
		if(options.suelo == 10){
			material = new THREE.MeshLambertMaterial( {color: options.colorSuelo, side: THREE.DoubleSide} );
		}
		else{
			var t = texturasSuelo[options.suelo].clone();
			t.needsUpdate = true;
			material = new THREE.MeshLambertMaterial({map:t, side: THREE.DoubleSide});
		}

		var w = L / granoSuelo; 
		var lim = L/2 - (w / 2);
		var x1 = (origenSuelo.position.x + lim) / w;
		var z1 = (origenSuelo.position.z - lim) / -w;

		var x2 = (baldosa.position.x + lim) / w;
		var z2 = (baldosa.position.z - lim) / -w;

		var finx = Math.max(x1,x2);
		var inix = Math.min(x1,x2);
		var finz = Math.max(z1,z2);
		var iniz = Math.min(z1,z2);

		for(var z = iniz; z <= finz; z++){
			for(var x = inix; x <= finx; x++){
				baldosasSuelo[z][x].material = material;	
			}
		}
	}
}

function terminarSuelo(event){
	if(event != undefined && event.origDomEvent.which == 1){
		for(var z = 0; z < materialesSuelo.length; z++){
			for(var x = 0; x < materialesSuelo[z].length; x++){
				materialesSuelo[z][x] = baldosasSuelo[z][x].material;
			}
		}
	}
	else{
		limpiarSuelo();
	}
	origenSuelo = undefined;

	eliminarListeners();
	baldosasSuelo.forEach(function(baldosaFila, indx, array){
		baldosaFila.forEach(function(baldosa, indy, array){
			domEvents.addEventListener(baldosa, "mouseover", prePonerSuelo);
			domEvents.addEventListener(baldosa, "mouseout", desPonerSuelo);
			domEvents.addEventListener(baldosa, "mousedown", empezarSuelo);

			listeners.push([baldosa, "mouseover", prePonerSuelo]);
			listeners.push([baldosa, "mouseout", desPonerSuelo]);
			listeners.push([baldosa, "mousedown", empezarSuelo]);
		});
	});
}

function limpiarSuelo(){
	for(var z = 0; z < baldosasSuelo.length; z++){
		for(var x = 0; x < baldosasSuelo[z].length; x++){
			baldosasSuelo[z][x].material = materialesSuelo[z][x];	
		}
	}
}

// Puertas
function prePonerPuerta(event, indx, indy){
	var panel = muros[indx][indy];
	var rotPanel = panel.rotation.y;
	var hip = caracPuerta[1];
	var hipt = caracPuerta[2]
	var co = hip * Math.sin(rotPanel);
	var cc = hip * Math.cos(rotPanel);
	var cot = hipt * Math.sin(rotPanel);
	var cct = hipt * Math.cos(rotPanel);

	scene.add(puerta);
	scene.add(puertaTrampa);

	puerta.position.set(panel.position.x + co, caracPuerta[0], panel.position.z + cc);
	puertaTrampa.position.set(panel.position.x - cot, caracPuerta[0], panel.position.z - cct);

	var ang = rotPanel + caracPuerta[3];
	if(ang >= Math.PI) ang -= Math.PI;
	else if(ang <= -Math.PI) ang += Math.PI;
	puerta.rotation.y = ang
	puertaTrampa.rotation.y = ang;

}
function desPonerPuerta(event, indx, indy){
	var panel = muros[indx][indy];
	var rotPanel = panel.rotation.y;
	var hip = caracPuerta[1];
	var co = hip * Math.sin(rotPanel);
	var cc = hip * Math.cos(rotPanel);

	if(puerta.position.x==panel.position.x + co && puerta.position.z==panel.position.z + cc){
		scene.remove(puerta);
		scene.remove(puertaTrampa);
	}
}
function ponerPuerta(event, indx, indy){
	puerta = puerta.clone();
	puertaTrampa = puertaTrampa.clone();
	murosPermitidosPuertas[indx][indy] = false;
	var panel = muros[indx][indy];
	for(var i = 0; i < listeners.length; i++){
		var l = listeners[i];
		if(l[0] == panel){
			domEvents.removeEventListener(l[0], l[1], l[2]);
			listeners.splice(i, 1);
			i--;
		}
	}
}

// Ventanas
function prePonerVentana(event, indx, indy){
	var panel = muros[indx][indy];
	var rotPanel = panel.rotation.y;
	var scalex = tamsMuros[indx] * granoSuelo / L;

	ventana.position.set(panel.position.x, alturaVentana, panel.position.z);
	ventana.rotation.y = rotPanel;
	ventana.scale.x = scalex;
	scene.add(ventana);

	panelAbierto.position.set(panel.position.x, panel.position.y, panel.position.z);
	panelAbierto.rotation.y = panel.rotation.y;
	panelAbierto.scale.x = scalex;
	scene.add(panelAbierto);
	panelAbierto.material = materialesMuros[indx][indy];
	panelAbierto.traverse( function(node) {
        if ( node instanceof THREE.Mesh ) { 
        	materiales = [];
			var ancho = node.geometry.parameters.width;
			var alto = node.geometry.parameters.height;
        	for(var i = 0; i < 6; i++){
        		var texInd = materialesMurosInd[indx][indy][i]
        		if(texInd == 11)
        			materiales.push(materialesMuros[indx][indy][i])
        		else{
					var t = texturasMuros[texInd].clone();
					t.needsUpdate = true;
					t.repeat.set(ancho/altoMuros, alto/altoMuros);
					if(node.position.y > 0){
						t.offset.y = (altoMuros - alto) / altoMuros;
					}
					materiales.push(new THREE.MeshLambertMaterial({map:t}));
        		}
        	}
        	node.material = materiales;
        }
    });

	scene.remove(panel);
}

function desPonerVentana(event, indx, indy){
	var panel = muros[indx][indy];
	if(ventana.position.x == panel.position.x && ventana.position.z == panel.position.z){
		scene.remove(ventana);
		scene.remove(panelAbierto);
	}
	scene.add(panel);
}

function ponerVentana(event, indx, indy){
	murosPermitidos[indx][indy] = false;
	var panel = muros[indx][indy];
	for(var i = 0; i < listeners.length; i++){
		var l = listeners[i];
		if(l[0] == panel){
			domEvents.removeEventListener(l[0], l[1], l[2]);
			listeners.splice(i, 1);
			i--;
		}
	}
	muros[indx][indy] = panelAbierto;
	materialesMuros[indx][indy] = []
	panelAbierto.traverse( function(node) {
        if ( node instanceof THREE.Mesh ) { 
        	materialesMuros[indx][indy].push(node.material);
        }
    });

	ventana = ventana.clone();
	panelAbierto = panelAbierto.clone();
}

// Objetos
function prePonerObjeto(event){
	objetoActual.position.x = event.intersect.point.x + desfaseObjetosX[options.objetos]
	objetoActual.position.z = event.intersect.point.z + desfaseObjetosZ[options.objetos]
}
function ponerObjeto(event){
	objetoAColocar = objetoActual.clone();
	scene.add(objetoAColocar);
}


function removeFolder(gui, name){
	var folder = gui.__folders[name];
  	if (!folder) {
    	return;
  	}
  	folder.close();
  	gui.__ul.removeChild(folder.domElement.parentNode);
  	delete gui.__folders[name];
  	gui.onResize();
}