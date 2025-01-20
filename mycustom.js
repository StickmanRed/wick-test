/* Modified Transformations
 * This code adds more keybinds to the cursor and enables shape skewing.
 */
paper.SelectionWidget.prototype.updateTransformation = function(item, e) {
    if (this.currentTransformation === 'translate') {
        this._ghost.position = this._ghost.position.add(e.delta);
    } else {
        // Wick. What is wrong with you. It would be nice if I could place the initiation in this function. But why in the world do I get a
        // Uncaught TypeError: Cannot read properties of undefined (reading 'includes')
        if (!this.mod?.initiated) {
            this.mod = {
                initiated: true
            }

            this.mod.onePoint = new paper.Point(1, 1);
            this.mod.initialPoint = e.point;

            this.mod.truePivot = this.pivot;

            if (this.currentTransformation === 'rotate') {
                this.mod.action = 'rotate';
                this.mod.rotateDelta = 0;
                this.mod.initialAngle = this.mod.initialPoint.subtract(this.pivot).angle;
                this.mod.initialBoxRotation = this.boxRotation ?? 0;
            } else if (item.data.handleEdge.includes('Center')) {
                this.mod.action = 'move-edge';
                this.mod.topLeft = item.data.handleEdge === 'topCenter' || item.data.handleEdge === 'leftCenter';
                this.mod.vertical = item.data.handleEdge === 'topCenter' || item.data.handleEdge === 'bottomCenter';

                this.mod.transformMatrix = new paper.Matrix();
            } else {
                this.mod.action = 'move-corner';
            }
        }

        this.mod.modifiers = {
            skew: e.modifiers.command, // Skew when Ctrl/Cmd pressed
            center: !e.modifiers.alt, // Always scale from center unless Alt pressed
            freescale: !e.modifiers.shift // Never retain proportions unless Shift pressed
        }

        if (this.mod.action === 'rotate') {
            this._ghost.rotate(-this.mod.rotateDelta, this.pivot);

            var rotateDelta = e.point.subtract(this.pivot).angle - this.mod.initialAngle;
            if (!this.mod.modifiers.freescale) {
                rotateDelta = Math.round(Math.round(rotateDelta / 45) * 45);
            }
            this.mod.rotateDelta = rotateDelta;
            this.boxRotation = this.mod.initialBoxRotation + rotateDelta;

            this._ghost.rotate(this.mod.rotateDelta, this.pivot);
        } else if (this.mod.action === 'move-corner') {
            this._ghost.rotate(-this.boxRotation, this.pivot);
            this._ghost.scale(this.mod.onePoint.divide(this._ghost.data.scale), this.mod.truePivot);

            if (this.mod.modifiers.center) {
                this.mod.truePivot = this.pivot;
            } else {
                let bounds = this._ghost.bounds;
                switch (item.data.handleEdge) {
                    case 'topRight':
                        this.mod.truePivot = bounds.bottomLeft;
                        break;
                    case 'topLeft':
                        this.mod.truePivot = bounds.bottomRight;
                        break;
                    case 'bottomRight':
                        this.mod.truePivot = bounds.topLeft;
                        break;
                    case 'bottomLeft':
                        this.mod.truePivot = bounds.topRight;
                        break;
                }
            }

            var currentPointRelative = e.point.rotate(-this.boxRotation, this.pivot).subtract(this.mod.truePivot);
            var initialPointRelative = this.mod.initialPoint.rotate(-this.boxRotation, this.pivot).subtract(this.mod.truePivot);
            var scaleFactor = currentPointRelative.divide(initialPointRelative);
            if (!this.mod.modifiers.freescale) {
                if (Math.abs(scaleFactor.x) < Math.abs(scaleFactor.y)) {
                    scaleFactor.x = Math.sign(scaleFactor.x) * Math.abs(scaleFactor.y);
                } else {
                    scaleFactor.y = Math.sign(scaleFactor.y) * Math.abs(scaleFactor.x);
                }
            }
            this._ghost.data.scale = scaleFactor;

            this._ghost.scale(this._ghost.data.scale, this.mod.truePivot);
            this._ghost.rotate(this.boxRotation, this.pivot);
        } else {
            this._ghost.rotate(-this.boxRotation, this.pivot);
            this._ghost.translate(this.mod.truePivot.multiply(-1)).transform(this.mod.transformMatrix.inverted()).translate(this.mod.truePivot);

            if (this.mod.modifiers.center) {
                this.mod.truePivot = this.pivot;
            } else {
                if (this.mod.topLeft) {
                    this.mod.truePivot = this._ghost.bounds.bottomRight;
                } else {
                    this.mod.truePivot = this._ghost.bounds.topLeft;
                }
            }

            this.mod.transformMatrix.reset();

            var currentPointRelative = e.point.rotate(-this.boxRotation, this.pivot);
            var initialPointRelative = this.mod.initialPoint.rotate(-this.boxRotation, this.pivot);

            if (!this.mod.modifiers.skew || (this.mod.modifiers.skew && e.modifiers.shift)) {
                var scaleFactor = currentPointRelative.subtract(this.mod.truePivot).divide(initialPointRelative.subtract(this.mod.truePivot));
                if (this.mod.vertical) {
                    scaleFactor.x = 1;
                } else {
                    scaleFactor.y = 1;
                }

                this.mod.transformMatrix.scale(scaleFactor)
            }
            if (this.mod.modifiers.skew) {
                // Shear is still a factor. Apply shear after scale to transform properly
                var shearFactor = currentPointRelative.subtract(initialPointRelative).divide(this._ghost.bounds.height, this._ghost.bounds.width);
                if (this.mod.vertical) {
                    shearFactor.y = 0;
                } else {
                    shearFactor.x = 0;
                }
                if (this.mod.modifiers.center) {
                    shearFactor = shearFactor.multiply(2);
                }
                if (this.mod.topLeft) {
                    shearFactor = shearFactor.multiply(-1);
                };

                this.mod.transformMatrix.shear(shearFactor.transform(this.mod.transformMatrix.inverted()));
            }

            this._ghost.translate(this.mod.truePivot.multiply(-1)).transform(this.mod.transformMatrix).translate(this.mod.truePivot);
            this._ghost.rotate(this.boxRotation, this.pivot);
        }
    }
}
paper.SelectionWidget.prototype.finishTransformation = function(item) {
    if (!this._currentTransformation) return;

    this._ghost.remove();

    if (this.currentTransformation === 'translate') {
        var d = this._ghost.position.subtract(this._ghost.data.initialPosition);
        this.translateSelection(d);
    } else if (this.currentTransformation === 'rotate') {
        this.rotateSelection(this._ghost.rotation);
    } else if (this.currentTransformation === 'scale') {
        if (this.mod.action === 'move-corner') {
            this.scaleSelectionMod(this._ghost.data.scale, this.mod.truePivot);
        } else {
            this.transformSelectionMod(this.mod.transformMatrix, this.mod.truePivot);
        }
    }

    this._currentTransformation = null;
    this.mod.initiated = false;
}

paper.SelectionWidget.prototype.scaleSelectionMod = function(scale, pivot) {
    this._itemsInSelection.forEach(item => {
        item.rotate(-this.boxRotation, this.pivot);
        item.scale(scale, pivot);
        item.rotate(this.boxRotation, this.pivot);
    });

    var newPivot = pivot.add(this.pivot.subtract(pivot).multiply(scale));
    this.pivot = newPivot.rotate(this.boxRotation, this.pivot);
}
paper.SelectionWidget.prototype.transformSelectionMod = function(matrix, pivot) {
    this._itemsInSelection.forEach(item => {
        item.rotate(-this.boxRotation, this.pivot);
        item.translate(pivot.multiply(-1)).transform(matrix).translate(pivot);
        item.rotate(this.boxRotation, this.pivot);
    });

    // Note that the GUI won't show this pivot as the center because it doesn't account for skew.
    // The pivot point after the skew will look a bit off.
    var newPivot = pivot.add(this.pivot.subtract(pivot).transform(matrix));
    this.pivot = newPivot.rotate(this.boxRotation, this.pivot);
}
