/** Helper function to divide a path evenly.
 * path: The path to divide.
 * slices: How many sections to divide the path into.
 * return: Modifies the input path.
 */
function divideInto(path, slices) {
    for (let i = 1; i < slices; i++) {
        path.divideAt(path.length * i / slices);
    }
}
/** Helper function to ensure two paths have the same amount of segments.
 * path1, path2: The two paths.
 * return: Modifies one of the two input paths.
 */
function coercePaths(path1, path2) {
    var length1 = path1.segments.length;
    var length2 = path2.segments.length;
    if (length1 < length2) {
        divideInto(path1, length2 - length1 + 1);
    }
    else if (length1 > length2) {
        divideInto(path2, length1 - length2 + 1);
    }
}
/** Helper function to interpolate between two paths.
 * startPath: The starting path/compoundPath.
 * endPath: The end path/compoundPath.
 * usedPath: The path to be used in the interpolation.
 * return: A function with one goal - interpolate.
 */
function createInterpolation(startPath, endPath) {
    // https://github.com/paperjs/paper.js/blob/develop/src/path/PathItem.js#L683-L692
    // usedPath clones endPath because the above raises an error if CompoundPaths don't have the same number of paths.
    var usedPath = endPath.clone({insert: false});
    usedPath.style = startPath.style;

    // TODO: Handle CompoundPaths.
    coercePaths(startPath, endPath);
    
    return (factor) => {
        usedPath.interpolate(startPath, endPath, factor);
        return usedPath;
    };
}

/** Rudimentary shape tweening.
 * layerIndex: The index of the layer in which the frames reside.
 * start: The time of the starting frame.
 * end: The time of the ending frame.
 * return: Adds interpolation frames between the start and end.
 */
function shapeTween(layerIndex, start, end) {
    // Retrieve the layer and frames we'll be working with.
    layer = project.activeTimeline.layers[layerIndex];
    startFrame = layer.getFrameAtPlayheadPosition(start)._children;
    endFrame = layer.getFrameAtPlayheadPosition(end)._children;

    // Set up the interpolation functions.
    var updates = [];
    startFrame.forEach((startWickObj, index) => {
        // TODO: Check if startWickObj is the same type as endWickObj and they're not clips.
        var endWickObj = endFrame[index];
        
        var startPath = startWickObj._view._item;
        var endPath = endWickObj._view._item;

        var startPathClone = startPath.clone();
        var endPathClone = endPath.clone();
        updates.push(createInterpolation(startPathClone, endPathClone));
        startPathClone.remove();
        endPathClone.remove();
    });

    for (var i = start + 1; i < end; i++) {
        // Add the paths to the frames and the frames to the layer.
        var progress = (i - start) / (end - start);

        var newFrame = new Wick.Frame({start: i})
        updates.forEach((update) => {
            newFrame.addPath(new Wick.Path({path: update(progress)}));
        });
        
        layer.addFrame(newFrame)
    }

    // Celebrate.
}
