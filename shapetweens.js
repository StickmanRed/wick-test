/** Helper function to divide a path evenly.
 * path: The path to divide.
 * slices: How many sections to divide the path into.
 *
 * return: Modifies the input path.
 */
function divideInto(path, slices) {
    for (let i = 1; i < slices; i++) {
        path.divideAt(path.length * i / slices);
    }
}
/** Helper function to interpolate between two paths.
 *
 * startPath: The starting path.
 * endPath: The end path.
 * usedPath: The path to be used in the interpolation.
 *
 * returns: A function with one goal - interpolate.
 */
function createInterpolation(startPath, endPath, usedPath) {
    var startLength = startPath.segments.length;
    var endLength = endPath.segments.length;
    
    // Make the paths have an equal amount of segments.
    if (startLength < endLength) {
        divideInto(startPath, endLength - startLength + 1);
    }
    else if (startLength > endLength) {
        divideInto(endPath, startLength - endLength + 1);
    }

    return (factor) => {
        usedPath.interpolate(startPath, endPath, factor);
        return usedPath.clone();
    };
}

/** Rudimentary shape tweening.
 *
 * layerIndex: The index of the layer in which the frames reside.
 * start: The time of the starting frame.
 * end: The time of the ending frame.
 *
 * return: Adds interpolation frames between the start and end.
 */
function shapeTween(layerIndex, start, end) {
    // Retrieve the layer and frames we'll be working with.
    layer = project.activeTimeline.layers[layerIndex];
    startFrame = layer.getFrameAtPlayheadPosition(start);
    endFrame = layer.getFrameAtPlayheadPosition(end);

    // Set up the interpolation functions.
    var updates = [];
    startFrame._children.forEach((startWickPath, index) => {
        var startPath = startWickPath._view._item;
        var endPath = endFrame._children[index]._view._item;

        var inter = new paper.Path();
        inter.style = startPath.style;
        var startPathClone = startPath.clone();
        var endPathClone = endPath.clone();
        updates.push(createInterpolation(startPathClone, endPathClone, inter));
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
