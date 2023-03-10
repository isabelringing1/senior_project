
const videoWidth = 600;
const videoHeight = 600;
var req = 0;
var video = 0;
var bodypixnet = 0;
var stopped = false;
var count = 5;
var verts = 0;
var colors = 0;
var clickedPt = "";
var paint = NONE;
var tree = 0;
var points = 0;
var picked_color = BG;

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

async function setupCamera(){
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
            'Browser API navigator.mediaDevices.getUserMedia not available');
      }
    
    const video = document.getElementById('video');
    video.width = videoWidth;
    video.height = videoHeight;
    const stream = await navigator.mediaDevices.getUserMedia({
        'audio': false,
        'video': {
          facingMode: 'user',
          width: videoWidth,
          height: videoHeight,
        },
      });
    video.srcObject = stream;

    return new Promise((resolve) => {
    video.onloadedmetadata = () => {
        resolve(video);
    };
    });
}

async function loadVideo() {
    const video = await setupCamera();
    
    video.play();
    return video;
}
  
function renderVideoOutput(video){
    if (stopped) {return;}
    const canvas = document.getElementById('output');
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext('2d');
    async function updateFrame(){
        if (stopped) {return;}
        ctx.clearRect(0, 0, videoWidth, videoHeight);
        ctx.save();
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
        ctx.restore();
    
        req = requestAnimationFrame(updateFrame);
    }
    updateFrame();
}

// Toggles loading UI 
function showLoading(loading){
    console.log("loading is " + loading);
}

function takePicture(){
    document.getElementById("capture-button").disabled = true;
    document.getElementById("view-button").disabled = true;
    countdown();
    console.log("disabled buttons");
}

function countdown(){
    if (count == 0){
        console.log("click!");
        stopped = true;
        document.getElementById("count").innerHTML = "";
        cancelAnimationFrame(req);
        replaceText(1);
        getPose();
    }
    else{
        document.getElementById("count").innerHTML = count;
        count -= 1;
        if (count == 0){
            setTimeout(function(){ 
                document.getElementById("count").innerHTML = "";
            }, 1000);
        }
        setTimeout(countdown, 1000);
    }
}

function replaceText(i){
    left = document.getElementsByClassName('left')[0];
    right = document.getElementsByClassName('right')[0];
    left.classList.remove("fade-in");
    right.classList.remove("fade-in");
    void left.offsetWidth;
    void right.offsetWidth;
    if (i == 1){
        left.style.marginTop = '50px';
        left.innerHTML = "Move the blue dots to fit your body.\
        <br\><br\>Pay special attention to your <b>torso</b>; place the dots in the \
        middle of your shoulders, and on the border of your hips."
        right.innerHTML = "You can retake the photo if you don't like it. <br\><br\>\
        Press Done when you're finished adjusting your pose."
    }
    else if (i == 2){
        left.style.marginTop = '350px';
        left.innerHTML = "Use the palette to edit coloring of your body and your head."
        right.innerHTML = "Don't worry about being super precise. Instead, focus on \
        getting proportions right.  <br\><br\> Also, don't include excess hair as part \
        of the head region."
    }
    else if (i == 3){
        left.innerHTML = "";
        right.innerHTML = "";
        document.getElementById('final-mask').style.display = "block";
        document.getElementById('done').style.display = "none";
    }
    left.classList.add("fade-in");
    right.classList.add("fade-in");
}

async function getPose(){
    var canvas = document.getElementById("output");
    const segmentation = await bodypixnet.segmentPersonParts(canvas, {
        flipHorizontal: true,
        internalResolution: 'high',
        segmentationThreshold: 0.7,
        maxDetections: 1
    });
    pose = segmentation.allPoses[0];

    for (var i = 0; i < pose.keypoints.length; i++){
        pose.keypoints[i].position.x = canvas.width - pose.keypoints[i].position.x;
    }

    var posecanvas = document.getElementById("posecanvas");
    posecanvas.width = canvas.width;
    posecanvas.height = canvas.height;
    const ctx = posecanvas.getContext('2d');
    verts = drawKeypoints(pose.keypoints, minPartConfidence, ctx);
    drawSkeleton(pose.keypoints, minPartConfidence, ctx);

    var canvas_mask = document.getElementById("output-mask");
    const coloredPartImage = bodyPix.toColoredPartMask(segmentation, partColors);
    var blank = document.createElement('img'); 
    blank.height = coloredPartImage.height;
    blank.width = coloredPartImage.width;
    blank.id = 'blank';
    bodyPix.drawMask(canvas_mask, blank, coloredPartImage, .6, 0, true);
    colors = coloredPartImage;
    canvas_mask.style.display = "NONE";
    document.getElementById('menu').style.display = "flex";
    setup_pose();

    document.getElementById('capture-button').style.display = "NONE"; 
    document.getElementById('view-button').style.display = "NONE";
    document.getElementById('show-mask').style.display = "";
    document.getElementById('show-mask').addEventListener('click', function(){setup_mask(blank)});
}

function setup_pose(){
    const p_click_handler = (event, posecanvas) => changeImage(event, posecanvas);
    const p_move_handler = (event, posecanvas) => dragPoint(event, posecanvas);
    posecanvas.addEventListener('mousedown', (event) => p_click_handler(event, posecanvas)); 
    posecanvas.addEventListener('mousemove', (event) => p_move_handler(event, posecanvas)); 
    posecanvas.addEventListener('mouseup', function(){clickedPt="";})
    posecanvas.addEventListener('mouseout', function(){clickedPt="";})
}

function setup_mask(blank){
    console.log('setting up mask');
    replaceText(2);
    document.getElementById('menu').classList.add("slide");
    setTimeout(function(){document.getElementById('menu').style.zIndex = 5;}, 1000)
    document.getElementById('bg').addEventListener('click', function(){picked_color=BG;})
    document.getElementById('body').addEventListener('click', function(){picked_color=GREEN;})
    document.getElementById('head').addEventListener('click', function(){picked_color=PURPLE;})
    document.getElementById("posecanvas").style.display = "NONE";
    canvas_mask = document.getElementById("output-mask");
    canvas_mask.style.display = "";

    const c_click_handler = (event, canvas_mask) => startPaint(event, canvas_mask);
    const c_move_handler = (event, canvas_mask, blank) => paintCanvas(event, canvas_mask, blank);
    canvas_mask.addEventListener('mousedown', (event) => c_click_handler(event, canvas_mask)); 
    canvas_mask.addEventListener('mousemove', (event) => c_move_handler(event, canvas_mask, blank)); 
    canvas_mask.addEventListener('mouseup', function(){paint=NONE;})
    canvas_mask.addEventListener('mouseout', function(){paint=NONE;})

    document.getElementById('show-mask').style.display = "NONE";
    document.getElementById('done').style.display = "";
    document.getElementById('done').addEventListener('click', function(){
        document.getElementById('mask').style.display = 'NONE';
        document.getElementById('menu').style.display = 'NONE';
        replaceText(3);
        query = gather_data();
        console.log("finding closest match(es) to " + query);
        closest = knn(tree, 5, query, points);
        console.log(closest)
        var pieces = [];
        for (i in closest.container){
            pieces.push([closest.container[i].data.vp, closest.container[i].dist])
        }
        document.getElementById('results').innerHTML = "Your Closest Matches:";
        for (i in pieces){
            getPainting(i);
            //"<br/> Work " + pieces[i][0] + ", Distance " + pieces[i][1]
        }
    });
}

function startPaint(e, canvas){
    color = 0;
    paint = picked_color;
    console.log("painting color " + paint);
}

function paintCanvas(e, canvas, blank){
    if (paint == NONE) {return;}
    let x = e.pageX - canvas.offsetParent.offsetLeft;
    let y = e.pageY - canvas.offsetParent.offsetTop;
    var w, h;
    for (var i = -10; i < 10; i++){
        for (var j = -10; j < 10; j++){
            w = canvas.width - x+i; h = y+j;
            if (w < 0 || w >= colors.width){w = x;}
            if (h < 0 || h >= colors.height){h = y;}
            colors.data[(h * colors.width + w) * 4] = paint[0];
            colors.data[(h * colors.width + w) * 4 + 1] = paint[1];
            colors.data[(h * colors.width + w) * 4 + 2] = paint[2];
            colors.data[(h * colors.width + w) * 4 + 3] = paint[3];
        }
    }
    bodyPix.drawMask(canvas, blank, colors, .6, 0, true);
}

function gather_data(){
    verts = new Map([...verts].sort((a, b) => a[1] - b[1]))
    vertexArray = Array.from(verts.keys());

    torsoHeight = (point_dist(vertexArray[BP.get("leftShoulder")], vertexArray[BP.get("leftHip")])
    + point_dist(vertexArray[BP.get("rightShoulder")], vertexArray[BP.get("rightHip")])) / 2
    shoulderWidth = point_dist(vertexArray[BP.get("leftShoulder")], vertexArray[BP.get("rightShoulder")])
    hipWidth = point_dist(vertexArray[BP.get("rightHip")], vertexArray[BP.get("leftHip")])

    stRatio = shoulderWidth / torsoHeight;
    shRatio = shoulderWidth / hipWidth;
    var hbRatio = gethbRatio(colors.data);
    return [stRatio, shRatio, hbRatio];
}

function changeImage(e, canvas){
    let x = e.pageX - canvas.offsetParent.offsetLeft;
    let y = e.pageY - canvas.offsetParent.offsetTop;
    console.log(x, y)
    var points = [];
    for (var i = -5; i <  5; i++){
        for (var j = -5; j <  5; j++){
            points.push((y + i) + "," + (x + j));
        }
    }

    for (var i = 0; i < points.length; i++){
        if (verts.has(points[i])){
            console.log("found " + points[i] + " as " + vertices.get(points[i]));
            clickedPt = points[i];
            break;
        }
    }
    console.log(verts)
}

function dragPoint(e, canvas){
    if (clickedPt == "") return;
    ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let x = e.pageX - canvas.offsetParent.offsetLeft;
    let y = e.pageY - canvas.offsetParent.offsetTop;

    let i = verts.get(clickedPt)
    verts.delete(clickedPt);
    let newPt = y+","+x
    verts.set(newPt, i);
    clickedPt = newPt;
    verts = new Map([...verts].sort((a, b) => a[1] - b[1]))
    vertexArray = Array.from(verts.keys());
    
    drawKPfromVertices(vertexArray, ctx);
    drawSKfromVertices(vertexArray, ctx);
}

function toggleVideo(){
    if (!stopped){
        cancelAnimationFrame(req);
        document.getElementById("view-button").innerHTML = "Turn on video";
        stopped = true;
    }
    else{
        stopped = false;
        document.getElementById("view-button").innerHTML = "Turn off video";
        renderVideoOutput(video);
    }
    console.log('stopped is ' + stopped);
}

function formatResults(row){
    results = document.getElementById('results');

    block = document.createElement('div');
    text = document.createElement('div');
    img = document.createElement('img');
    img.src = row[8];
    
    block.classList.add('info-block');
    text.classList.add('info-text');
    img.classList.add('info-img');
    
    block.appendChild(img);
    block.appendChild(text);
    results.appendChild(block);

    row[3] = row[3].substring(0, 400) + "...";
    link = "<a href=" + row[7] + "> Learn More </a>" 
    
    text.innerHTML = "<p class='info-title'>" + row[0] + "</p>" + //title
    "<p class='info-subtitle'>" + row[1] + "<br/>" + row[2] + ", " + row[6] +  //artist | year, medium
    "<br/>Country: " + row[5] + ", Movement: " + row[4] + "</p>" //country, movement 
    +  "<p class='info-plain'>" + row[3] + "</p>" +
    "<p>" + link + "</p>"; //learn more link
    
    
}

//use low level posenet to get 
document.addEventListener("DOMContentLoaded", async function(){
    loadJSON('json/tree.json', function(response) {
        tree = JSON.parse(response);
        console.log(tree)
    });
    loadJSON('json/points.json', function(response) {
        points = JSON.parse(response);
        for (i in points){
            for (j in points[i]){
                points[i][j] = parseFloat(points[i][j])
            }
        }
        console.log(points)
    });
    document.getElementById("hide-modal").addEventListener("click", async function(){
        document.getElementById("modal").style.opacity = 0;
        document.getElementById("modal").style.zIndex = -10;
        if (video!=0) return;
        try {
            video = await loadVideo();
          } catch (e) {
              console.log('this browser does not support video capture,' +
              'or this device does not have a camera')
            throw e;
        }
        renderVideoOutput(video);
    });
    showLoading(true);
    bodypixnet = await bodyPix.load({architecture: 'MobileNetV1'});
    showLoading(false);
    document.getElementById("capture-button").addEventListener("click", takePicture);
    document.getElementById("view-button").addEventListener("click", toggleVideo);
    document.getElementById("title").addEventListener("click", function(){
        document.getElementById("modal").style.zIndex = 10;
        document.getElementById("modal").style.opacity = 1;
    });
});


