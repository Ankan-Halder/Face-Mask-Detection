	const h=document.querySelector('body').clientHeight-document.querySelector("nav").clientHeight;
	document.getElementById('video-container').style.height= `${h}px`;

	//loader function
	const hideLoader = ()=>{
		document.getElementById('loader').style.display="none";
		document.getElementById('video').classList.remove('blur');
		document.getElementById('output').classList.remove('blur');
	}

	//global variables
	var model, mask_model, videoWidth, videoHeight,
		canvas = document.getElementById('output'),
		ctx = canvas.getContext('2d');

	const video = document.getElementById('video');

	const state = {
	  backend: 'webgl'
	};

	//set up the camera function
	async function setupCamera() {
		const stream = await navigator.mediaDevices.getUserMedia({
		    'audio': false,
		    'video': { facingMode: 'user' },
		});
		video.srcObject = stream;
	    return new Promise((resolve) => {
		    video.onloadedmetadata = () => {
		      resolve(video);
		    };
		});
	}

	//prediction function
	const renderPrediction = async () => {
		tf.engine().startScope()
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		//estimatefaces model takes in 4 parameter (1) video, returnTensors, flipHorizontal, and annotateBoxes
		const predictions = await model.estimateFaces(video, true,false,false);
		const offset = tf.scalar(127.5);
		//check if prediction length is more than 0
		if (predictions.length > 0) {
			//clear context
		    
		    for (let i = 0; i < predictions.length; i++) {
		    	var text=""
			    var start = predictions[i].topLeft.arraySync();
			    var end = predictions[i].bottomRight.arraySync();
			    var size = [end[0] - start[0], end[1] - start[1]];
			    if(videoWidth<end[0] && videoHeight<end[0]){
			    	console.log("image out of frame")
			    	continue
			    }
			    var inputImage = tf.browser.fromPixels(video).toFloat()
			    inputImage = inputImage.sub(offset).div(offset);
			    inputImage=inputImage.slice([parseInt(start[1]),parseInt(start[0]),0],[parseInt(size[1]),parseInt(size[0]),3])
				inputImage=inputImage.resizeBilinear([224,224]).reshape([1,224,224,3])
				

				result=mask_model.predict(inputImage).dataSync()
				
				




			    result= Array.from(result)
			    ctx.beginPath()
			    if (result[1]>result[0]){
			    	//no mask on
			      	ctx.strokeStyle="red"
			      	ctx.fillStyle = "red";
			      	text = "No Mask: "+(result[1]*100).toPrecision(3).toString()+"%";
			    }else{
			    	//mask on
			      	ctx.strokeStyle="green"
			      	ctx.fillStyle = "green";
			      	text = "Mask: "+(result[0]*100).toPrecision(3).toString()+"%";
			    }
		        ctx.lineWidth = "4"
			    ctx.rect(start[0], start[1],size[0], size[1])
			    ctx.stroke()
			    ctx.font = "bold 15pt sans-serif";
			    ctx.fillText(text,start[0]+5,start[1]+20)
		    }     
		}
		//update frame
		requestAnimationFrame(renderPrediction);
		tf.engine().endScope()
	};

	const setupPage = async () => {
	    await tf.setBackend(state.backend);
	    await setupCamera();
	    video.play();

	    videoWidth = video.videoWidth;
	    videoHeight = video.videoHeight;
	    video.width = videoWidth;
	    video.height = videoHeight;

	    
	    canvas.width = videoWidth;
	    canvas.height = videoHeight;
	    
	    ctx.fillStyle = "rgba(255, 0, 0, 0.5)"; 

	    model = await blazeface.load();
	    
	    mask_model = await tf.loadLayersModel('model/model.json');

	   renderPrediction();
	};

	const init = async ()=>{
		//console.log('loading...');
		await setupPage();
		hideLoader();
	}
	
	init();
