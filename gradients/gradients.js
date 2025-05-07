// Working on converting gradient-secondattempt.js to a Wick Tool.

Wick.Tools.GradientTool = class extends Wick.Tool {
    constructor () {
        super();

        this.name = 'gradienttool';

        this.SELECTION_TOLERANCE = 3;
        this.CURSOR_DEFAULT = 'cursors/default.png';

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
        
    }

    onMouseDown (e) {
        
    }

    onMouseDrag (e) {
        
    }

    onMouseUp (e) {
        
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
                    && !result.item.data.isBorder;
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
}
