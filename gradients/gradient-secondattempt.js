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

thiszoom = 0.5;
//paper.view.zoom = thiszoom;

const ENDPOINT_RADIUS = 5 / thiszoom;
const OUTLINE_COLOR = '#0c8ce9';
const COLOR_STOP_RECT_RADIUS = 12 / thiszoom;
const COLOR_STOP_RECT_PADDING = 2 / thiszoom
const COLOR_STOP_OUTLINE_WIDTH = 2 / thiszoom;
const ENDPOINT_LINE_STOP_DISTANCE = 5 / thiszoom;
const ENDPOINT_LINE_WIDTH = 1 / thiszoom;
const COLOR_STOP_CREATE_DISTANCE = ENDPOINT_LINE_STOP_DISTANCE + 2.2 * COLOR_STOP_RECT_RADIUS;
const OFFSET_HOVER_DISTANCE = 60 / thiszoom;
const TEXT_HOVER_RECT_MARGIN = 4 / thiszoom;

/* 
 * this.colorStops: List containing paper.Group objects representing the color stops.
 * this.endpoints: List containing the start and end point paper.Path objects.
 * this.endpointLine: The paper.Path object of the line between the two endpoints.
 * this.colorStopHover: The paper.Group object displaying the in-between color at the mouse.
 * this.textHover: paper.Group object that displays text.
 * 
 * this.hitResult: paper.HitResult object for the latest onMouseDown event.
 * this.hitObject: this.hitResult.item
 *
 * this.target: The paper.Path/paper.CompoundPath whose gradient is being edited.
 * this.selectedIsStroke: Equals true if the stroke of the object is being edited, instead of the fill.
 * this.isRadial: Equals true if the gradient of the object is radial.
 *
 * this.selectedColorStop: One of the paper.Group objects in this.colorStops.
 * this.targetNeedsUpdate: Equals true if this.selectedObject will be updated in onMouseUp.
 */

var thiscolorStops = [];
var thisendpoints = [
    new paper.Path.Circle({
        center: [0,0],
        radius: ENDPOINT_RADIUS,
        fillColor: OUTLINE_COLOR,
        insert: false,
        data: {
            gradientIsGUI: true,
            gradientEndpoint: 'start'
        }
    }),
    new paper.Path.Circle({
        center: [0,0],
        radius: ENDPOINT_RADIUS,
        fillColor: OUTLINE_COLOR,
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
    strokeColor: OUTLINE_COLOR,
    insert: false,
    data: {
        gradientIsGUI: true,
        gradientIsEndpointLine: true
    }
});
var thiscolorStopHover = createColorStop({gradientIsHover: true}, true);
var thistextHover = (() => {
    var text = new paper.PointText({
        justification: 'center',
        fillColor: 'white',
        data: {
            gradientIsHover: true
        }
    });
    text.position = [0, 0];
    var back = new paper.Path();
    var textHover = new paper.Group({
        children: [back, text],
        applyMatrix: false,
        data: {
            gradientIsHover: true,
            gradientSetText: textContent => {
                text.content = textContent;
                text.position = [0, 0];
                var newBack = new paper.Path.Rectangle({
                    center: [0, 0],
                    size: [
                        text.bounds.width + 2 * TEXT_HOVER_RECT_MARGIN,
                        text.bounds.height + 2 * TEXT_HOVER_RECT_MARGIN
                    ],
                    radius: 2,
                    fillColor: OUTLINE_COLOR,
                    data: {
                        gradientIsHover: true
                    }
                });
                back.replaceWith(newBack);
                back = newBack;
            }
        }
    });
    
    return textHover;
})();

var thishitResult = new paper.HitResult();
var thishitObject = null;

var thistarget = null;
var thisselectedIsStroke = null;
var thisisRadial = false;

var thisselectedColorStop = null;
var thistargetNeedsUpdate = false;

//thisendpointLine.strokeWidth = ENDPOINT_LINE_WIDTH;

function getTarget(e) {
    var result = project.hitTest(e.point, {
        fill: true,
        stroke: true,
        segments: true,
        tolerance: 3,
        match: (result => {
            return !result.item.data.gradientIsHover
        })
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

function onMouseMove(e) {
    var hitPath = getTarget(e).item;
    if (hitPath && hitPath.parent.data.gradientStopOffset !== undefined) hitPath = hitPath.parent;
    
    var distance = findPointLineDistance(
        thisendpoints[0].position,
        thisendpoints[1].position,
        e.point
    );
    var [getPosition, angle] = findPositionAngle(
        thisendpoints[0].position,
        thisendpoints[1].position
    );
    var offsetHover = null;
    if (thistarget && (0 <= distance && distance <= COLOR_STOP_CREATE_DISTANCE)
        && (!hitPath || !hitPath.data.gradientIsGUI)) {
        // The cursor is above the endpoint line and not touching any of the color stops
        var { color, offset } = interpolateColor(e.point);
        thiscolorStopHover.data.gradientSetStopColor(color);
        
        thiscolorStopHover.position = getPosition(offset);
        thiscolorStopHover.rotation = angle;
        if (!thiscolorStopHover.parent) {
            thiscolorStopHover.addTo(paper.project);
        }
        
        offsetHover = offset;
    }
    else {
        if (thiscolorStopHover.parent) {
            thiscolorStopHover.remove();
        }
        if (hitPath && hitPath.data.gradientStopOffset !== undefined) {
            // The cursor is over a color stop
            offsetHover = hitPath.data.gradientStopOffset;
        }
    }
    
    if (offsetHover !== null) {
        thistextHover.data.gradientSetText(`${Math.round(offsetHover * 100)}%`);
        thistextHover.position = getPosition(offsetHover, OFFSET_HOVER_DISTANCE);
        if (!thistextHover.parent) thistextHover.addTo(paper.project);
    }
    else {
        if (thistextHover.parent) thistextHover.remove();
    }
}

function onMouseDown(e) {
    thishitResult = getTarget(e);
    thishitObject = thishitResult.item;
    thistargetNeedsUpdate = false;
    
    // Selection priority:
    // Color stops
    // Endpoints
    // Endpoint rotation
    // Color stop creation
    // Target paths
    if (thistarget && thishitObject && thishitObject.data.gradientIsGUI) {
        if (
            thishitObject.parent.data.gradientStopOffset !== undefined
            && !thishitObject.parent.data.gradientIsHover
        ) {
            // Clicked a color stop, select it
            thishitObject = thishitObject.parent;
            thisselectedColorStop = thishitObject;
            updateSelectedColorStops();
        }
    }
    else {
        // Check if clicked above the gradient line
        var distance = findPointLineDistance(
            thisendpoints[0].position,
            thisendpoints[1].position,
            e.point
        );
        if (thistarget && 0 <= distance && distance <= COLOR_STOP_CREATE_DISTANCE) {
            // Clicked above the gradient line, create a new stop
            var {stop, index} = interpolateColorStop(e.point);
            thiscolorStops.splice(index, 0, stop);
            stop.addTo(project);
            
            // Then select the new stop
            thishitObject = stop;
            thisselectedColorStop = thishitObject;
            updateSelectedColorStops();
            
            updateTarget();
        }
        else if (thishitObject) {
            // Clicked a path, select it
            thistarget = thishitObject;
            thisselectedIsStroke = (thishitResult.type === 'stroke');
            setupGUI();
        }
        else {
            // Nothing was clicked, so deselect everything
            destroyGUI();
            return null;
        }
    }
}
function onMouseDrag(e) {
    if (thiscolorStopHover.parent) thiscolorStopHover.remove();
    
    // If the GUI is dragged, move it
    if (thishitObject && thishitObject.data.gradientIsGUI) {
        thistargetNeedsUpdate = true;
        if (thishitObject.data.gradientStopOffset !== undefined) {
            // Calculate the stop offset
            var origin = thisendpoints[0].position;
            var destination = thisendpoints[1].position;
            var offset = findPointOffset(origin, destination, e.point);
            
            // Update the stop
            var getPosition = findPositionAngle(origin, destination)[0];
            thishitObject.position = getPosition(offset);
            thishitObject.data.gradientStopOffset = offset;
            
            // Update the offset indicator
            thistextHover.data.gradientSetText(`${Math.round(offset * 100)}%`);
            thistextHover.position = getPosition(offset, OFFSET_HOVER_DISTANCE);
        }
        else {
            if (thistextHover.parent) thistextHover.remove();
            
            if (thishitObject && thishitObject.data.gradientEndpoint) {
                // Move the endpoint
                thishitObject.position = e.point;
                
                // Update the rest of the GUI
                updateGUI();
            }
        }
        updateTarget();
    }
}
function onMouseUp(e) {
    if (!thishitObject) return null;
    
    // If the GUI was dragged, push the values to the target object
    if (thishitObject.data.gradientIsGUI && thistargetNeedsUpdate) {
        updateTarget();
        thistargetNeedsUpdate = false;
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
                // Paper.js won't accept only one stop, so just set both stops to the same color
                var otherColor = thiscolorStops[1 - index].data.gradientGetStopColor();
                thisselectedColorStop.data.gradientSetStopColor(otherColor.clone());
                //thisselectedColorStop = thiscolorStops[1 - index];
            }
            else {
                thiscolorStops.splice(index, 1)[0].remove();
                if (index >= thiscolorStops.length) {
                    index = thiscolorStops.length - 1;
                };
                //thisselectedColorStop = thiscolorStops[index];
            }
            thisselectedColorStop = null;
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
    if (thisselectedIsStroke) color = thistarget.strokeColor;
    else color = thistarget.fillColor;
    
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
        origin = thistarget.bounds.leftCenter;
        destination = thistarget.bounds.rightCenter;
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
    
    if (thisselectedIsStroke) thistarget.strokeColor = color;
    else thistarget.fillColor = color;
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
    
    thistarget = null;
    thisselectedColorStop = null;
}

function createColorStop(data, hover) {
    if (!data) data = {};
    
    var radius = COLOR_STOP_RECT_RADIUS;
    var padding = COLOR_STOP_RECT_PADDING;
    var height = radius/5;
    var borderColor = '#cccccc';
    var selectedBorderColor = OUTLINE_COLOR;
    var stopFillPath = new paper.Path.Rectangle({
        center: [0, -(radius+height)],
        size: [2*(radius-padding), 2*(radius-padding)],
        fillColor: 'red',
        strokeWidth: 0,
        data: {
            gradientIsGUI: true,
            ...data
        }
    });
    var stopGroup = new paper.Group({
        children: [
            new paper.Path.Rectangle({
                center: [0, -(radius+height)],
                size: [2*radius, 2*radius],
                fillColor: '#ffffff',
                strokeWidth: COLOR_STOP_OUTLINE_WIDTH,
                data: {
                    gradientIsGUI: true,
                    ...data
                }
            }),
            ... (!hover) ? [new paper.Path({
                segments: [
                    [-height, -height], [0,0], [height, -height]
                ],
                closed: true,
                fillColor: '#ffffff',
                strokeWidth: COLOR_STOP_OUTLINE_WIDTH,
                data: {
                    gradientIsGUI: true,
                    ...data
                }
            })] : [],
            stopFillPath
        ],
        strokeColor: borderColor,
        pivot: [0, 0],
        applyMatrix: false,
        data: {
            gradientIsGUI: true,
            ...data
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
    var { color, offset, index } = interpolateColor(point);
    
    // Set up the new color stop
    var newColorStop = createColorStop();
    var [getPosition, angle] = findPositionAngle(
        thisendpoints[0].position,
        thisendpoints[1].position
    );
    newColorStop.data.gradientStopOffset = offset;
    newColorStop.position = getPosition(offset);
    newColorStop.rotation = angle;
    newColorStop.data.gradientSetStopColor(color);
    
    return {
        stop: newColorStop,
        index: index
    };
}
function interpolateColor(point) {
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
    
    return {
        color: newColor,
        offset: offset,
        index: nextStopIndex
    }
}
function findPositionAngle(origin, destination) {
    var directionVector = destination.subtract(origin);
    var normal = new paper.Point(directionVector.y, -directionVector.x).normalize();
    
    var getPosition = (offset, distance) => {
        var position = origin.add(directionVector.multiply(offset));
        position = position.add(normal.multiply(
            (distance === undefined) ? ENDPOINT_LINE_STOP_DISTANCE : distance
        ));
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
function findPointLineDistance(origin, destination, point) {
    var parallel = destination.subtract(origin);
    var offsetVector = point.subtract(origin);
    offsetVector = offsetVector.rotate(-parallel.angle);
    
    return -offsetVector.y;
}
