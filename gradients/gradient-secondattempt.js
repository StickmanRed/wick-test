var path2 = new Path.Rectangle({
    point: [680,130],
    size: [120,120],
    fillColor: 'red'
});
var path1 = new Path.Rectangle({
    point: [80, 80],
    size: [240, 240]
});
path1.fillColor = {
    stops: [
        ['red', 0],
        ['orange', 0.32],
        ['green', 0.65],
        ['blue', 1]
    ],
    origin: path1.bounds.leftCenter,
    destination: path1.bounds.rightCenter
};

var path3 = new Path.Rectangle({
    point: [280, 480],
    size: [370, 260]
});
path3.fillColor = {
    gradient: {
        stops: [
            ['yellow', 0],
            ['purple', 0.5],
            ['transparent', 1]
        ],
        radial: true
    },
    origin: path3.bounds.leftCenter,
    destination: path3.bounds.rightCenter
};
path3.strokeColor = {
    gradient: {
        stops: [
            ['yellow', 0],
            ['purple', 0.5],
            ['transparent', 1]
        ],
        radial: true
    },
    origin: path3.bounds.leftCenter,
    destination: path3.bounds.rightCenter
};
path3.strokeWidth = 10;

const ENDPOINT_RADIUS = 5;
const ENDPOINT_COLOR = 'blue';
const COLOR_STOP_RECT_RADIUS = 12;

var thiscolorStops = [];
var thisendpoints = [
    new paper.Path.Circle({
        center: [0,0],
        radius: ENDPOINT_RADIUS,
        fillColor: ENDPOINT_COLOR,
        insert: false,
        data: {
            gradientIsGUI: true,
            gradientEndpoint: 'start'
        }
    }),
    new paper.Path.Circle({
        center: [0,0],
        radius: ENDPOINT_RADIUS,
        fillColor: ENDPOINT_COLOR,
        insert: false,
        data: {
            gradientIsGUI: true,
            gradientEndpoint: 'end'
        }
    })
];
var thisendpointLine = new paper.Path.Line({
    from: [0,0],
    to: [0,0],
    strokeColor: ENDPOINT_COLOR,
    insert: false,
    data: {
        gradientIsGUI: true,
        gradientIsEndpointLine: true
    }
});

var thishitResult = null;
var thistarget = null;

var thisselectedObject = null;
var thisselectedIsStroke = null;
var thisisRadial = false;

var thisselectedColorStop = null;
var thisobjectNeedsUpdate = false;

function getTarget(e) {
    var result = project.hitTest(e.point, {
        fill: true,
        stroke: true,
        segments: true,
        tolerance: 3
    });
    if (!result) result = new paper.HitResult();
    return result;
}
/*
let isGUI = path => path.data.gradientIsGUI;
let isColorStop = path => path.data.gradientStopOffset;
let isEndpoint = path => path.data.gradientEndpoint;
let isEndpointLine = path => path.data.gradientIsEndpointLine;
*/

function onMouseDown(e) {
    thishitResult = getTarget(e);
    thistarget = thishitResult.item;
    thisobjectNeedsUpdate = false;
    
    if (!thistarget) {
        // Nothing was clicked, so deselect everything
        destroyGUI();
        return null;
    }
    
    if (thistarget.data.gradientIsGUI) {
        if (thistarget.parent.data.gradientStopOffset !== undefined) {
            // Clicked a color stop, select it
            thistarget = thistarget.parent;
            thisselectedColorStop = thistarget;
            updateSelectedColorStops();
        }
        else if (thistarget.data.gradientIsEndpointLine) {
            // Clicked above the gradient line, create a new stop
            interpolateColorStop(e.point);
            updateTarget();
        }
    }
    else {
        // Set up the gradient GUI
        thisselectedObject = thistarget;
        thisselectedIsStroke = (thishitResult.type === 'stroke');
        setupGUI();
    }
}
function onMouseDrag(e) {
    if (!thistarget) return null;
    
    // If the GUI is dragged, move it
    if (thistarget.data.gradientIsGUI) {
        thisobjectNeedsUpdate = true;
        if (thistarget.data.gradientStopOffset !== undefined) {
            // Calculate the stop offset
            var origin = thisendpoints[0].position;
            var destination = thisendpoints[1].position;
            var offset = findPointOffset(origin, destination, e.point);
            
            // Update the stop
            var getPosition = findPositionAngle(origin, destination)[0];
            thistarget.position = getPosition(offset);
            thistarget.data.gradientStopOffset = offset;
        }
        else if (thistarget.data.gradientEndpoint) {
            // Move the endpoint
            thistarget.position = e.point;
            
            // Update the rest of the GUI
            updateGUI();
        }
        updateTarget();
    }
}
function onMouseUp(e) {
    if (!thistarget) return null;
    
    // If the GUI was dragged, push the values to the target object
    if (thistarget.data.gradientIsGUI && thisobjectNeedsUpdate) {
        updateTarget();
    }
}

var lastKeyPressed = null;
function onKeyDown(e) {
    if (e.key === lastKeyPressed) return null;
    lastKeyPressed = e.key;
    
    console.log(e.key);
    if ((e.key === 'backspace') || (e.key === 'delete')) {
        if (thisselectedColorStop) {
            var index = thiscolorStops.indexOf(thisselectedColorStop);
            if (thiscolorStops.length <= 2) {
                // We can't only have one stop, so just set the current stop to
                // the color of the other stop
                var otherColor = thiscolorStops[1 - index].data.gradientGetStopColor();
                thisselectedColorStop.data.gradientSetStopColor(otherColor.clone());
                thisselectedColorStop = thiscolorStops[1 - index];
            }
            else {
                thiscolorStops.splice(index, 1)[0].remove();
                if (index >= thiscolorStops.length) {
                    index = thiscolorStops.length - 1;
                };
                thisselectedColorStop = thiscolorStops[index];
            }
            updateTarget();
            updateSelectedColorStops();
        }
    }
}
function onKeyUp(e) {
    lastKeyPressed = null;
}

// When an object is first clicked, the GUI paths get set up using information
// from the object.
// After that, the object gets updated using information from the GUI paths.

function setupGUI() {
    // Remove all the gradient stops
    // Only the stops, since all the endpoints will be added back anyway
    thiscolorStops.forEach(colorStop => {
        colorStop.remove();
    });
    
    // Extract gradient information from target object
    var color;
    if (thisselectedIsStroke) color = thisselectedObject.strokeColor;
    else color = thisselectedObject.fillColor;
    
    var origin, destination, stops;
    if (color.gradient) {
        origin = color.origin;
        destination = color.destination;
        stops = color.gradient.stops.map(gradientStop => {
            return [gradientStop.color, gradientStop.offset];
        }).sort((stop1, stop2) => {
            return stop1[1] - stop2[1];
        });
        thisisRadial = color.gradient.radial;
    }
    else {
        // Fill is a solid color, emulate gradient
        origin = thisselectedObject.bounds.leftCenter;
        destination = thisselectedObject.bounds.rightCenter;
        stops = [[color, 0], [color.clone(), 1]];
        thisisRadial = false;
    }
    
    // Update the GUI paths using the target object's gradient
    var [getPosition, angle] = findPositionAngle(origin, destination);
    stops.forEach((stopCouplet, idx) => {
        if (idx >= thiscolorStops.length) {
            thiscolorStops.push(createColorStop());
        }
        var colorStop = thiscolorStops[idx];
        colorStop.data.gradientStopOffset = stopCouplet[1];
        colorStop.position = getPosition(stopCouplet[1]);
        colorStop.rotation = angle;
        
        // Set the color of the stop
        colorStop.data.gradientSetStopColor(stopCouplet[0]);
        colorStop.data.gradientSetSelected(idx === 0);
    });
    thiscolorStops.length = stops.length;
    thisselectedColorStop = thiscolorStops[0];
    
    thisendpoints[0].position = origin;
    thisendpoints[1].position = destination;
    thisendpointLine.segments[0].point = origin;
    thisendpointLine.segments[1].point = destination;
    
    // Put back all the GUI paths
    thiscolorStops.forEach(stop => stop.addTo(project));
    thisendpointLine.addTo(project);
    thisendpoints.forEach(endpoint => endpoint.addTo(project));
}
function updateGUI() {
    // Update the gradient line
    var origin = thisendpoints[0].position;
    var destination = thisendpoints[1].position;
    thisendpointLine.segments[0].point = origin;
    thisendpointLine.segments[1].point = destination;
    
    // Update the color stops
    var [getPosition, angle] = findPositionAngle(origin, destination);
    thiscolorStops.forEach(colorPath => {
        var position = getPosition(colorPath.data.gradientStopOffset);
        colorPath.position = position;
        colorPath.rotation = angle;
    });
}
function updateSelectedColorStops() {
    thiscolorStops.forEach(colorStop => {
        colorStop.data.gradientSetSelected(colorStop === thisselectedColorStop);
    });
}
function updateTarget() {
    // Get origin, destination, and stops from GUI paths
    var origin = thisendpointLine.segments[0].point;
    var destination = thisendpointLine.segments[1].point;
    var stops = thiscolorStops.map(colorPath => {
        // Get the color of the stop
        var stopColor = colorPath.data.gradientGetStopColor();
        
        return [stopColor, colorPath.data.gradientStopOffset];
    });
    
    // Set the target fillColor to that
    color = {
        gradient: {
            stops: stops,
            radial: thisisRadial
        },
        origin: origin,
        destination: destination
    };
    
    if (thisselectedIsStroke) thisselectedObject.strokeColor = color;
    else thisselectedObject.fillColor = color;
    
    thistargetNeedsUpdate = false;
}
function destroyGUI() {
    // Remove all the GUI paths from the canvas
    thiscolorStops.forEach(colorPath => {
        colorPath.remove();
    });
    thisendpoints.forEach(endPath => {
        endPath.remove();
    });
    thisendpointLine.remove();
    
    thisselectedObject = null;
    thisselectedColorStop = null;
}

function createColorStop() {
    var radius = COLOR_STOP_RECT_RADIUS;
    var height = radius/5;
    var borderColor = '#cccccc';
    var selectedBorderColor = 'blue';
    var stopFillPath = new paper.Path.Rectangle({
        center: [0, -(radius+height)],
        size: [2*radius-4, 2*radius-4],
        fillColor: 'red',
        strokeWidth: 0,
        data: {
            gradientIsGUI: true
        }
    });
    var stopGroup = new paper.Group({
        children: [
            new paper.Path.Rectangle({
                center: [0, -(radius+height)],
                size: [2*radius, 2*radius],
                fillColor: '#ffffff',
                strokeWidth: 2,
                data: {
                    gradientIsGUI: true
                }
            }),
            new paper.Path({
                segments: [
                    [-height, -height], [0,0], [height, -height]
                ],
                closed: true,
                fillColor: '#ffffff',
                strokeWidth: 2,
                data: {
                    gradientIsGUI: true
                }
            }),
            stopFillPath
        ],
        strokeColor: borderColor,
        pivot: [0, 0],
        applyMatrix: false,
        data: {
            gradientIsGUI: true
        }
    });
    
    stopGroup.data.gradientSetStopColor = fillColor => {
        stopFillPath.fillColor = fillColor;
    };
    stopGroup.data.gradientGetStopColor = () => {
        return stopFillPath.fillColor;
    };
    stopGroup.data.gradientSetSelected = selected => {
        if (selected) stopGroup.strokeColor = selectedBorderColor;
        else stopGroup.strokeColor = borderColor;
    };
    
    return stopGroup;
}
function interpolateColorStop(point) {
    var offset = findPointOffset(
        thisendpoints[0].position,
        thisendpoints[1].position,
        point
    );
    
    // Find the two stops user clicked between
    var stops = thiscolorStops.map(stop => {
        return [stop.data.gradientGetStopColor(), stop.data.gradientStopOffset];
    }).sort((stop1, stop2) => {
        return stop1[1] - stop2[1];
    });
    var nextStopIndex = stops.findIndex(stopCouplet => {
        return stopCouplet[1] > offset;
    });
    // Find the color of the new stop
    var newColor;
    if (nextStopIndex === -1) {
        newColor = stops[stops.length - 1][0].clone();
    }
    else if (nextStopIndex === 0) {
        newColor = stops[0][0].clone();
    }
    else {
        var prevStop = stops[nextStopIndex - 1];
        var nextStop = stops[nextStopIndex];
        var percent = (offset - prevStop[1]) / (nextStop[1] - prevStop[1]);
        
        newColor = prevStop[0].add(
            nextStop[0].subtract(prevStop[0]).multiply(percent)
        );
        newColor.alpha =
            prevStop[0].alpha
            + (nextStop[0].alpha - prevStop[0].alpha) * percent;
    }
    
    // Set up the new color stop
    var newColorStop = createColorStop();
    thiscolorStops.splice(nextStopIndex, 0, newColorStop);
    
    var [getPosition, angle] = findPositionAngle(
        thisendpoints[0].position,
        thisendpoints[1].position
    );
    newColorStop.data.gradientStopOffset = offset;
    newColorStop.position = getPosition(offset);
    newColorStop.rotation = angle;
    newColorStop.data.gradientSetStopColor(newColor);
    
    newColorStop.addTo(project);
}
function findPositionAngle(origin, destination) {
    var directionVector = destination.subtract(origin);
    var normal = new paper.Point(directionVector.y, -directionVector.x).normalize();
    
    var getPosition = offset => {
        var position = origin.add(directionVector.multiply(offset));
        position = position.add(normal.multiply(10));
        return position;
    };
    return [getPosition, normal.angle + 90];
}
function findPointOffset(origin, destination, point) {
    var parallel = destination.subtract(origin);
    var offsetVector = point.subtract(origin);
    offsetVector = offsetVector.rotate(-parallel.angle);
    
    var offset = offsetVector.x / parallel.length;
    if (offset < 0) offset = 0;
    else if (offset > 1) offset = 1;
    
    return offset;
}
