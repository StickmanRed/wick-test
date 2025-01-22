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

    return (factor) => usedPath.interpolate(startPath, endPath, factor);
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

    // Get the first path of each frame.
    // TODO: Shape tween all paths of frame.
    startPath = startFrame._children[0]._view._item;
    endPath = endFrame._children[0]._view._item;

    // Set up the interpolation function.
    inter = new paper.Path();
    inter.style = startPath.style;
    startPathClone = startPath.clone();
    endPathClone = endPath.clone();
    update = createInterpolation(startPathClone, endPathClone, inter);
    startPathClone.remove();
    endPathClone.remove();

    for (let i = start + 1; i < end; i++) {
        // Find the interpolation.
        var progress = (i - start) / (end - start);
        update(progress)
        
        // Add the frames.
        var newFrame = new Wick.Frame({start: i})
        newFrame.addPath(new Wick.Path({path: inter.clone()}))
        layer.addFrame(newFrame)
    }

    // Celebrate.
}
