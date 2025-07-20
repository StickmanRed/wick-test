// Working on converting gradient-secondattempt.js to a Wick Tool.

Wick.Tools.GradientTool = class extends Wick.Tool {
    constructor () {
        super();

        this.name = 'gradienttool';

        this.SELECTION_TOLERANCE = 3;
        this.CURSOR_DEFAULT = 'cursors/default.png';

        // Constants
        this.BASE_ELSD = 5;
        this.BASE_OHD = 60;
        this.BASE_ELW = 1;
        
        this.ENDPOINT_RADIUS = 5;
        this.OUTLINE_COLOR = '#0c8ce9';
        this.COLOR_STOP_RECT_RADIUS = 12;
        this.COLOR_STOP_RECT_PADDING = 2;
        this.COLOR_STOP_OUTLINE_WIDTH = 2;
        this.TEXT_HOVER_RECT_MARGIN = 4;

        // Constants affected by scaling
        this.endpointLineStopDistance = this.BASE_ELSD;
        this.endpointLineWidth = this.BASE_ELW;
        this.colorStopCreateDistance = this.endpointLineStopDistance + 2.2 * this.COLOR_STOP_RECT_RADIUS;
        this.offsetHoverDistance = this.BASE_OHD;

        this.zoom = 1;

        this.colorStops = [];
        this.endpoints = [
            new this.paper.Path.Circle({
                center: [0,0],
                radius: this.ENDPOINT_RADIUS,
                fillColor: this.OUTLINE_COLOR,
                insert: false,
                applyMatrix: false,
                data: {
                    gradientIsGUI: true,
                    gradientEndpoint: 'start'
                }
            }),
            new this.paper.Path.Circle({
                center: [0,0],
                radius: this.ENDPOINT_RADIUS,
                fillColor: this.OUTLINE_COLOR,
                insert: false,
                applyMatrix: false,
                data: {
                    gradientIsGUI: true,
                    gradientEndpoint: 'end'
                }
            })
        ];
        this.endpointLine = new this.paper.Path.Line({
            from: [0,0],
            to: [0,0],
            strokeColor: this.OUTLINE_COLOR,
            insert: false,
            data: {
                gradientIsGUI: true,
                gradientIsEndpointLine: true
            }
        });
        this.colorStopHover = this._createColorStop({gradientIsHover: true}, true);
        this.textHover = (() => {
            var text = new this.paper.PointText({
                justification: 'center',
                fillColor: 'white',
                data: {
                    gradientIsHover: true
                }
            });
            text.position = [0, 0];
            var back = new this.paper.Path();
            var textHover = new this.paper.Group({
                children: [back, text],
                applyMatrix: false,
                data: {
                    gradientIsHover: true,
                    gradientSetText: textContent => {
                        text.content = textContent;
                        text.position = [0, 0];
                        var newBack = new this.paper.Path.Rectangle({
                            center: [0, 0],
                            size: [
                                text.bounds.width + 2 * this.TEXT_HOVER_RECT_MARGIN,
                                text.bounds.height + 2 * this.TEXT_HOVER_RECT_MARGIN
                            ],
                            radius: 2,
                            fillColor: this.OUTLINE_COLOR,
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
        
        this.hitResult = new this.paper.HitResult();
        this.hitObject = null;
        
        this.target = null;
        this.selectedIsStroke = null;
        this.isRadial = false;
        
        this.selectedColorStop = null;
        this.targetNeedsUpdate = false;

        this.currentCursorIcon = '';
    }

    get cursor () {
        return 'url("'+this.currentCursorIcon+'") 32 32, auto';
    }

    onActivate (e) {
        
    }

    onDeactivate (e) {
        
    }

    onMouseMove (e) {
        var hitPath = this._updateHitResult(e).item;
        //if (hitPath && hitPath.parent.data.gradientStopOffset !== undefined) hitPath = hitPath.parent;
        
        var distance = this._findPointLineDistance(
            this.endpoints[0].position,
            this.endpoints[1].position,
            e.point
        );
        var [getPosition, angle] = this._findPositionAngle(
            this.endpoints[0].position,
            this.endpoints[1].position
        );
        var offsetHover = null;
        if (this.target && (0 <= distance && distance <= this.colorStopCreateDistance)
            && (!hitPath || !hitPath.data.gradientIsGUI)) {
            // The cursor is above the endpoint line and not touching any of the color stops
            var { color, offset } = this._interpolateColor(e.point);
            this.colorStopHover.data.gradientSetStopColor(color);
            
            this.colorStopHover.position = getPosition(offset);
            this.colorStopHover.rotation = angle;
            if (!this.colorStopHover.parent) {
                this.colorStopHover.addTo(this.paper.project);
            }
            
            offsetHover = offset;
        }
        else {
            if (this.colorStopHover.parent) {
                this.colorStopHover.remove();
            }
            if (hitPath && hitPath.data.gradientStopOffset !== undefined) {
                // The cursor is over a color stop
                offsetHover = hitPath.data.gradientStopOffset;
            }
        }
        
        if (offsetHover !== null) {
            this.textHover.data.gradientSetText(`${Math.round(offsetHover * 100)}%`);
            this.textHover.position = getPosition(offsetHover, this.offsetHoverDistance);
            if (!this.textHover.parent) this.textHover.addTo(this.paper.project);
        }
        else {
            if (this.textHover.parent) this.textHover.remove();
        }
    }

    onMouseDown (e) {
        this.hitResult = this._updateHitResult(e);
        this.hitObject = this.hitResult.item;
        this.targetNeedsUpdate = false;
        
        // Selection priority:
        // Color stops
        // Endpoints
        // Endpoint rotation
        // Color stop creation
        // Target paths
        if (this.target && this.hitObject && this.hitObject.data.gradientIsGUI) {
            if (
                this.hitObject.data.gradientStopOffset !== undefined
                && !this.hitObject.data.gradientIsHover
            ) {
                // Clicked a color stop, select it
                //this.hitObject = this.hitObject.parent;
                this.selectedColorStop = this.hitObject;
                this._updateSelectedColorStops();
            }
        }
        else {
            // Check if clicked above the gradient line
            var distance = this._findPointLineDistance(
                this.endpoints[0].position,
                this.endpoints[1].position,
                e.point
            );
            if (this.target && 0 <= distance && distance <= this.colorStopCreateDistance) {
                // Clicked above the gradient line, create a new stop
                var {stop, index} = this._interpolateColorStop(e.point);
                this.colorStops.splice(index, 0, stop);
                stop.addTo(this.paper.project);
                
                // Then select the new stop
                this.hitObject = stop;
                this.selectedColorStop = this.hitObject;
                this._updateSelectedColorStops();
                
                this._updateTarget();
            }
            else if (this.hitObject) {
                // Clicked a path, select it
                this.target = this.hitObject;
                this.selectedIsStroke = (this.hitResult.type === 'stroke');
                this._setupGUI();
            }
            else {
                // Nothing was clicked, so deselect everything
                this._destroyGUI();
                return null;
            }
        }
    }

    onMouseDrag (e) {
        if (this.colorStopHover.parent) this.colorStopHover.remove();
        
        // If the GUI is dragged, move it
        if (this.hitObject && this.hitObject.data.gradientIsGUI) {
            this.targetNeedsUpdate = true;
            if (this.hitObject.data.gradientStopOffset !== undefined) {
                // Calculate the stop offset
                var origin = this.endpoints[0].position;
                var destination = this.endpoints[1].position;
                var offset = this._findPointOffset(origin, destination, e.point);
                
                // Update the stop
                var getPosition = this._findPositionAngle(origin, destination)[0];
                this.hitObject.position = getPosition(offset);
                this.hitObject.data.gradientStopOffset = offset;
                
                // Update the offset indicator
                this.textHover.data.gradientSetText(`${Math.round(offset * 100)}%`);
                this.textHover.position = getPosition(offset, this.offsetHoverDistance);
            }
            else {
                if (this.textHover.parent) this.textHover.remove();
                
                if (this.hitObject && this.hitObject.data.gradientEndpoint) {
                    // Move the endpoint
                    this.hitObject.position = e.point;
                    
                    // Update the rest of the GUI
                    this._updateGUI();
                }
            }
            this._updateTarget();
        }
    }

    onMouseUp (e) {
        if (!this.hitObject) return null;
        
        // If the GUI was dragged, push the values to the target object
        if (this.hitObject.data.gradientIsGUI && this.targetNeedsUpdate) {
            this._updateTarget();
            this.targetNeedsUpdate = false;
        }
    }

    onKeyDown (e) {
        
    }

    onKeyUp (e) {
        
    }
    
    _updateHitResult (e) {
        var newHitResult = this.paper.project.hitTest(e.point, {
            fill: true,
            stroke: true,
            curves: true,
            segments: true,
            tolerance: this.SELECTION_TOLERANCE,
            match: (result => {
                return result.item !== this.hoverPreview
                    && !result.item.data.isBorder
                    && !result.item.data.gradientIsHover;
            }),
        });
        if(!newHitResult) newHitResult = new this.paper.HitResult();

        if(newHitResult.item && !newHitResult.item.data.isSelectionBoxGUI) {
            // You can't select children of compound paths, you can only select the whole thing.
            if (newHitResult.item.parent.className === 'CompoundPath') {
                newHitResult.item = newHitResult.item.parent;
            }

            // You can't select individual children in a group, you can only select the whole thing.
            if (newHitResult.item.parent.parent) {
                newHitResult.type = 'fill';

                while (newHitResult.item.parent.parent) {
                    newHitResult.item = newHitResult.item.parent;
                }
            }

            // this.paper.js has two names for strokes+curves, we don't need that extra info
            if(newHitResult.type === 'stroke') {
                newHitResult.type = 'curve';
            }

            // Mousing over rasters acts the same as mousing over fills.
            if(newHitResult.type === 'pixel') {
                newHitResult.type = 'fill';
            }

            // Disable curve and segment selection. (this was moved to the PathCursor)
            if(newHitResult.type === 'segment' || newHitResult.type === 'curve') {
                newHitResult.type = 'fill';
            };
        }

        return newHitResult;
    }

    _getCursor () {
        return this.CURSOR_DEFAULT;
    }

    _setCursor (cursor) {
        this.currentCursorIcon = cursor;
    }

    _setupGUI () {
        // Remove all the gradient stops
        // Only the stops, since all the endpoints will be added back anyway
        this.colorStops.forEach(colorStop => {
            colorStop.remove();
        });
        
        // Extract gradient information from target object
        var color;
        if (this.selectedIsStroke) color = this.target.strokeColor;
        else color = this.target.fillColor;
        
        var origin, destination, stops;
        if (color.gradient) {
            origin = color.origin;
            destination = color.destination;
            stops = color.gradient.stops.map(gradientStop => {
                return [gradientStop.color, gradientStop.offset];
            }).sort((stop1, stop2) => {
                return stop1[1] - stop2[1];
            });
            this.isRadial = color.gradient.radial;
        }
        else {
            // Fill is a solid color, emulate gradient
            origin = this.target.bounds.leftCenter;
            destination = this.target.bounds.rightCenter;
            stops = [[color, 0], [color.clone(), 1]];
            this.isRadial = false;
        }
        
        // Update the GUI paths using the target object's gradient
        var [getPosition, angle] = this._findPositionAngle(origin, destination);
        stops.forEach((stopCouplet, idx) => {
            if (idx >= this.colorStops.length) {
                this.colorStops.push(this._createColorStop());
            }
            var colorStop = this.colorStops[idx];
            colorStop.data.gradientStopOffset = stopCouplet[1];
            colorStop.position = getPosition(stopCouplet[1]);
            colorStop.rotation = angle;
            
            // Set the color of the stop
            colorStop.data.gradientSetStopColor(stopCouplet[0]);
            colorStop.data.gradientSetSelected(idx === 0);
        });
        this.colorStops.length = stops.length;
        this.selectedColorStop = this.colorStops[0];
        
        this.endpoints[0].position = origin;
        this.endpoints[1].position = destination;
        this.endpointLine.segments[0].point = origin;
        this.endpointLine.segments[1].point = destination;
        
        // Put back all the GUI paths
        this.colorStops.forEach(stop => stop.addTo(this.paper.project));
        this.endpointLine.addTo(this.paper.project);
        this.endpoints.forEach(endpoint => endpoint.addTo(this.paper.project));
    }

    _updateGUI () {
        // Update the gradient line
        var origin = this.endpoints[0].position;
        var destination = this.endpoints[1].position;
        this.endpointLine.segments[0].point = origin;
        this.endpointLine.segments[1].point = destination;
        
        // Update the color stops
        var [getPosition, angle] = this._findPositionAngle(origin, destination);
        this.colorStops.forEach(colorPath => {
            var position = getPosition(colorPath.data.gradientStopOffset);
            colorPath.position = position;
            colorPath.rotation = angle;
        });
    }

    _updateZoom (zoom) {
        this.zoom = zoom;
        var scale = 1 / zoom;
        
        // Scale necessary metrics
        this.endpointLineStopDistance = this.BASE_ELSD / zoom;
        this.offsetHoverDistance = this.BASE_OHD / zoom;
        this.endpointLineWidth = this.BASE_ELW / zoom;
        this.colorStopCreateDistance = this.endpointLineStopDistance + 2.2 * this.COLOR_STOP_RECT_RADIUS / zoom;
    
        // Color stops
        var origin = this.endpoints[0].position;
        var destination = this.endpoints[1].position;
        this.colorStops.forEach(colorPath => colorPath.scaling = scale);
        var [getPosition, angle] = this._findPositionAngle(origin, destination);
        this.colorStops.forEach(colorPath => {
            var position = getPosition(colorPath.data.gradientStopOffset);
            colorPath.position = position;
            colorPath.rotation = angle;
        });
        
        // Endpoints
        this.endpoints[0].scaling = scale;
        this.endpoints[1].scaling = scale;
        // Endpoint line
        this.endpointLine.strokeWidth = this.endpointLineWidth;
        
        // Color stop hover
        this.colorStopHover.scaling = scale;
        var position = getPosition(this.colorStopHover.data.gradientStopOffset);
        this.colorStopHover.position = position;
        this.colorStopHover.rotation = angle;
        
        // Text hover pop-up
        this.textHover.scaling = scale;
    }

    _updateSelectedColorStops () {
        this.colorStops.forEach(colorStop => {
            colorStop.data.gradientSetSelected(colorStop === this.selectedColorStop);
        });
    }

    _updateTarget () {
        // Get origin, destination, and stops from GUI paths
        var origin = this.endpointLine.segments[0].point;
        var destination = this.endpointLine.segments[1].point;
        var stops = this.colorStops.map(colorPath => {
            // Get the color of the stop
            var stopColor = colorPath.data.gradientGetStopColor();
            
            return [stopColor, colorPath.data.gradientStopOffset];
        });
        
        // Set the target fillColor to that
        var color = {
            gradient: {
                stops: stops,
                radial: this.isRadial
            },
            origin: origin,
            destination: destination
        };
        
        if (this.selectedIsStroke) this.target.strokeColor = color;
        else this.target.fillColor = color;
    }

    _destroyGUI () {
        // Remove all the GUI paths from the canvas
        this.colorStops.forEach(colorPath => {
            colorPath.remove();
        });
        this.endpoints.forEach(endPath => {
            endPath.remove();
        });
        this.endpointLine.remove();
        
        this.target = null;
        this.selectedColorStop = null;
    }

    _createColorStop (data, hover) {
        if (!data) data = {};
        
        var radius = this.COLOR_STOP_RECT_RADIUS;
        var padding = this.COLOR_STOP_RECT_PADDING;
        var height = radius/5;
        var borderColor = '#cccccc';
        var selectedBorderColor = this.OUTLINE_COLOR;
        var stopFillPath = new this.paper.Path.Rectangle({
            center: [0, -(radius+height)],
            size: [2*(radius-padding), 2*(radius-padding)],
            fillColor: 'red',
            strokeWidth: 0,
            data: {
                gradientIsGUI: true,
                ...data
            }
        });
        var stopGroup = new this.paper.Group({
            children: [
                new this.paper.Path.Rectangle({
                    center: [0, -(radius+height)],
                    size: [2*radius, 2*radius],
                    fillColor: '#ffffff',
                    strokeWidth: this.COLOR_STOP_OUTLINE_WIDTH,
                    data: {
                        gradientIsGUI: true,
                        ...data
                    }
                }),
                ... (!hover) ? [new this.paper.Path({
                    segments: [
                        [-height, -height], [0,0], [height, -height]
                    ],
                    closed: true,
                    fillColor: '#ffffff',
                    strokeWidth: this.COLOR_STOP_OUTLINE_WIDTH,
                    data: {
                        gradientIsGUI: true,
                        ...data
                    }
                })] : [],
                stopFillPath
            ],
            strokeColor: borderColor,
            pivot: [0, 0],
            scaling: 1 / this.zoom,
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

    _interpolateColorStop (point) {
        var { color, offset, index } = this._interpolateColor(point);
        
        // Set up the new color stop
        var newColorStop = this._createColorStop();
        var [getPosition, angle] = this._findPositionAngle(
            this.endpoints[0].position,
            this.endpoints[1].position
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

    _interpolateColor (point) {
        var offset = this._findPointOffset(
            this.endpoints[0].position,
            this.endpoints[1].position,
            point
        );
        
        // Find the two stops user clicked between
        var stops = this.colorStops.map(stop => {
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

    _findPositionAngle (origin, destination) {
        var directionVector = destination.subtract(origin);
        var normal = new this.paper.Point(directionVector.y, -directionVector.x).normalize();
        
        var getPosition = (offset, distance) => {
            var position = origin.add(directionVector.multiply(offset));
            position = position.add(normal.multiply(
                (distance === undefined) ? this.endpointLineStopDistance : distance
            ));
            return position;
        };
        return [getPosition, normal.angle + 90];
    }

    _findPointOffset (origin, destination, point) {
        var parallel = destination.subtract(origin);
        var offsetVector = point.subtract(origin);
        offsetVector = offsetVector.rotate(-parallel.angle);
        
        var offset = offsetVector.x / parallel.length;
        if (offset < 0) offset = 0;
        else if (offset > 1) offset = 1;
        
        return offset;
    }

    _findPointLineDistance (origin, destination, point) {
        var parallel = destination.subtract(origin);
        var offsetVector = point.subtract(origin);
        offsetVector = offsetVector.rotate(-parallel.angle);
        
        return -offsetVector.y;
    }
}

//
project._tools.gradienttool = new Wick.Tools.GradientTool();
project._activeTool = project._tools.gradienttool;
project._tools.gradienttool.activate();
