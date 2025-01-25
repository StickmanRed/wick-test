/* First attempt at making gradient tool in paper.js.
 * This code is so messy, I'll just keep it here for a reference and do a total code rewrite.
 */

UI_COLOR = 'lightblue';

var gradient = {
    stops: [],
    endpoints: {},
    endHandles: []
};
function create(options) {
    if (gradient.stops) remove();
    
    var start = options.start;
    var end = options.end;
    var distance = end.subtract(start);
    var normal = new Point({
        length: 16,
        angle: distance.angle + 90
    });
    gradient.endpoints = {
        start: start,
        end: end,
        distance: distance,
        normal: normal
    }
    gradient.endHandles.push(new Path.Circle({
        center: start,
        radius: 5,
        fillColor: UI_COLOR,
        data: {
            gradientEnd: 'start'
        }
    }));
    gradient.endHandles.push(new Path.Circle({
        center: end,
        radius: 5,
        fillColor: UI_COLOR,
        data: {
            gradientEnd: 'end'
        }
    }));
    options.stops.forEach((stop) => {
        gradient.stops.push(new Path.Circle({
            center: start.add(distance.multiply(stop.offset)).add(normal),
            radius: 8,
            fillColor: stop.color,
            data: {
                gradientStop: true,
                offset: stop.offset
            }
        }));
    });
}
function remove() {
    gradient.stops.forEach((stop) => stop.remove());
    gradient.stops = [];
}

var a = new Path.Rectangle([50, 50], [100, 100])
a.style = {
    fillColor: {
        stops: [new GradientStop('red', 0),
                new GradientStop('green', 0.5),
                new GradientStop('blue', 1)],
        origin: a.bounds.bottomLeft,
        destination: a.bounds.bottomRight
    }
}

var mouseLogic = {
    targetItem: null,
    targetHandle: null
}

function onMouseDown(e) {
    mouseLogic.targetHandle = null;
    var test = project.hitTest(e.point);
    if (test) {
        if (test.item.data.gradientStop) {
            mouseLogic.targetHandle = test.item;
        }
        else if (test.item.data.gradientEnd) {
            mouseLogic.targetHandle = test.item;
        }
        else {
            test.item.selected = true;
            
            if (test.item.fillColor.gradient) {
                var stops = test.item.fillColor.gradient.stops;
            }
            else {
                var stops = [new GradientStop(test.item.fillColor, 0), new GradientStop(test.item.fillColor, 1)];
            }
            
            create({
                start: test.item.bounds.bottomLeft,
                end: test.item.bounds.bottomRight,
                stops: stops,
                item: test.item
            });
            
            mouseLogic.targetItem = test.item;
        }
    }
    else {
        mouseLogic.targetItem = null;
        remove();
        project.deselectAll();
    }
}

function onMouseDrag(e) {
    if (!mouseLogic.targetHandle) return;
    var target = mouseLogic.targetHandle;
    
    if (!gradient.endpoints) return;
    var points = gradient.endpoints;
    
    if (target.data.gradientStop) {
        var start = points.start.add(points.normal);
        mouse = e.point.subtract(start).project(points.distance)
        target.position = start.add(mouse);
        target.data.offset = Math.min(1, Math.max(0, mouse.x / points.distance.x));
    }
    else {
        target.position = e.point;
        if (target.data.gradientEnd === 'start') {
            gradient.endpoints.start = e.point;
        }
        else {
            gradient.endpoints.end = e.point;
        }
    }
}
function onMouseUp(e) {
    if (mouseLogic.targetItem && mouseLogic.targetHandle) {
        if (mouseLogic.targetItem.data.gradientStop) {
            mouseLogic.targetItem.fillColor = {
                gradient: {
                    stops: gradient.stops.map((stop) => [stop.fillColor, stop.data.offset])
                },
                origin: gradient.endpoints.start,
                destination: gradient.endpoints.end
            }
        }
        else {
            mouseLogic.targetItem.fillColor = {
                gradient: {
                    stops: gradient.stops.map((stop) => [stop.fillColor, stop.data.offset])
                },
                origin: gradient.endpoints.start,
                destination: gradient.endpoints.end
            }
            
            gradient.endpoints.distance = gradient.endpoints.end.subtract(gradient.endpoints.start);
            gradient.endpoints.normal = new Point({
                length: 16,
                angle: gradient.endpoints.distance.angle + 90
                
            })
            
            gradient.stops.forEach((stop) => {
                stop.position = gradient.endpoints.start.add(gradient.endpoints.distance.multiply(stop.data.offset)).add(gradient.endpoints.normal);
            });
        }
    }
}
