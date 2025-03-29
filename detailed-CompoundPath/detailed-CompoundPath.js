Wick.Tools.PathCursor.prototype._updateHitResult = function (e) {
    var newHitResult = this.paper.project.hitTest(e.point, {
        fill: true,
        stroke: true,
        curves: true,
        segments: true,
        handles: this.detailedEditing !== null,
        tolerance: this.SELECTION_TOLERANCE,
        match: (result => {
            return result.item !== this.hoverPreview
                && !result.item.data.isBorder;
        }),
    });
    if(!newHitResult) newHitResult = new this.paper.HitResult();

    if (this.detailedEditing !== null) {
        // Bugfix: newHitResult.item might be inside a CompoundPath
        var targetItem = newHitResult.item;
        if (targetItem && targetItem.parent.className === 'CompoundPath') {
            targetItem = targetItem.parent;
        }
        if (this._getWickUUID(targetItem) !== this._getWickUUID(this.detailedEditing)) {
            // Hits an item, but not the one currently in detail edit - handle as a click with no hit.
            return new this.paper.HitResult();
        }

        if (newHitResult.item && newHitResult.type.startsWith('handle')) {
            // If this a click on a handle, do not apply hit type prediction below.
            return newHitResult;
        }
    }

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
    }

    return newHitResult;
}
