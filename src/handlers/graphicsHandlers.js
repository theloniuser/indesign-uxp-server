/**
 * Graphics management handlers
 */
import { ScriptExecutor } from '../core/scriptExecutor.js';
import { formatResponse, formatErrorResponse, escapeJsxString } from '../utils/stringUtils.js';
import { sessionManager } from '../core/sessionManager.js';

export class GraphicsHandlers {
    /**
     * Create a rectangle on the active page
     */
    static async createRectangle(args) {
        const {
            x,
            y,
            width,
            height,
            fillColor,
            strokeColor,
            strokeWidth = 1,
            cornerRadius = 0
        } = args;

        // Use session manager for positioning if coordinates not provided
        const positioning = sessionManager.getCalculatedPositioning({ x, y, width, height });

        // Validate positioning before creating content
        const validation = sessionManager.validatePositioning(positioning.x, positioning.y, positioning.width, positioning.height);
        if (!validation.valid) {
            // Apply suggested corrections if available, otherwise use safe defaults
            if (validation.suggested) {
                Object.assign(positioning, validation.suggested);
            } else {
                // Fallback to safe positioning
                const safePos = sessionManager.getCalculatedPositioning({});
                Object.assign(positioning, safePos);
            }
        }

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var page = doc.pages[0];',
            '  var rectangle;',
            '',
            '  try {',
            '    // Create rectangle',
            `    rectangle = page.rectangles.add();`,
            `    rectangle.geometricBounds = [${positioning.y}, ${positioning.x}, ${positioning.y + positioning.height}, ${positioning.x + positioning.width}];`,
            '',
            '    // Apply fill color',
            `    if ("${fillColor}" !== "") {`,
            '      try {',
            `        rectangle.fillColor = doc.colors.itemByName("${fillColor}");`,
            '      } catch (colorError) {',
            '        // Use default color if specified color not found',
            '      }',
            '    }',
            '',
            '    // Apply stroke color',
            `    if ("${strokeColor}" !== "") {`,
            '      try {',
            `        rectangle.strokeColor = doc.colors.itemByName("${strokeColor}");`,
            `        rectangle.strokeWeight = ${strokeWidth};`,
            '      } catch (colorError) {',
            '        // Use default stroke if specified color not found',
            '      }',
            '    }',
            '',
            '    // Apply corner radius',
            `    if (${cornerRadius} > 0) {`,
            `      rectangle.topLeftCornerOption = CornerOptions.ROUNDED_CORNER;`,
            `      rectangle.topRightCornerOption = CornerOptions.ROUNDED_CORNER;`,
            `      rectangle.bottomLeftCornerOption = CornerOptions.ROUNDED_CORNER;`,
            `      rectangle.bottomRightCornerOption = CornerOptions.ROUNDED_CORNER;`,
            `      rectangle.cornerRadius = ${cornerRadius};`,
            '    }',
            '',
            '    "Rectangle created successfully";',
            '  } catch (error) {',
            '    "Error creating rectangle: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);

        // Store the created item info in session
        sessionManager.setLastCreatedItem({
            type: 'rectangle',
            position: positioning,
            fillColor: fillColor,
            strokeColor: strokeColor,
            strokeWidth: strokeWidth,
            cornerRadius: cornerRadius
        });

        return formatResponse(result, "Create Rectangle");
    }

    /**
     * Create an ellipse on the active page
     */
    static async createEllipse(args) {
        const {
            x,
            y,
            width,
            height,
            fillColor,
            strokeColor,
            strokeWidth = 1
        } = args;

        // Use session manager for positioning if coordinates not provided
        const positioning = sessionManager.getCalculatedPositioning({ x, y, width, height });

        // Validate positioning before creating content
        const validation = sessionManager.validatePositioning(positioning.x, positioning.y, positioning.width, positioning.height);
        if (!validation.valid) {
            // Apply suggested corrections if available, otherwise use safe defaults
            if (validation.suggested) {
                Object.assign(positioning, validation.suggested);
            } else {
                // Fallback to safe positioning
                const safePos = sessionManager.getCalculatedPositioning({});
                Object.assign(positioning, safePos);
            }
        }

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var page = doc.pages[0];',
            '  var ellipse;',
            '',
            '  try {',
            '    // Create ellipse',
            `    ellipse = page.ovals.add();`,
            `    ellipse.geometricBounds = [${positioning.y}, ${positioning.x}, ${positioning.y + positioning.height}, ${positioning.x + positioning.width}];`,
            '',
            '    // Apply fill color',
            `    if ("${fillColor}" !== "") {`,
            '      try {',
            `        ellipse.fillColor = doc.colors.itemByName("${fillColor}");`,
            '      } catch (colorError) {',
            '        // Use default color if specified color not found',
            '      }',
            '    }',
            '',
            '    // Apply stroke color',
            `    if ("${strokeColor}" !== "") {`,
            '      try {',
            `        ellipse.strokeColor = doc.colors.itemByName("${strokeColor}");`,
            `        ellipse.strokeWeight = ${strokeWidth};`,
            '      } catch (colorError) {',
            '        // Use default stroke if specified color not found',
            '      }',
            '    }',
            '',
            '    "Ellipse created successfully";',
            '  } catch (error) {',
            '    "Error creating ellipse: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);

        // Store the created item info in session
        sessionManager.setLastCreatedItem({
            type: 'ellipse',
            position: positioning,
            fillColor: fillColor,
            strokeColor: strokeColor,
            strokeWidth: strokeWidth
        });

        return formatResponse(result, "Create Ellipse");
    }

    /**
     * Create a polygon on the active page
     */
    static async createPolygon(args) {
        const {
            x,
            y,
            width,
            height,
            sides = 6,
            fillColor,
            strokeColor,
            strokeWidth = 1
        } = args;

        // Use session manager for positioning if coordinates not provided
        const positioning = sessionManager.getCalculatedPositioning({ x, y, width, height });

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var page = doc.pages[0];',
            '  var polygon;',
            '',
            '  try {',
            '    // Create polygon',
            `    polygon = page.polygons.add();`,
            `    polygon.geometricBounds = [${positioning.y}, ${positioning.x}, ${positioning.y + positioning.height}, ${positioning.x + positioning.width}];`,
            `    polygon.polygonSides = ${sides};`,
            '',
            '    // Apply fill color',
            `    if ("${fillColor}" !== "") {`,
            '      try {',
            `        polygon.fillColor = doc.colors.itemByName("${fillColor}");`,
            '      } catch (colorError) {',
            '        // Use default color if specified color not found',
            '      }',
            '    }',
            '',
            '    // Apply stroke color',
            `    if ("${strokeColor}" !== "") {`,
            '      try {',
            `        polygon.strokeColor = doc.colors.itemByName("${strokeColor}");`,
            `        polygon.strokeWeight = ${strokeWidth};`,
            '      } catch (colorError) {',
            '        // Use default stroke if specified color not found',
            '      }',
            '    }',
            '',
            '    "Polygon created successfully";',
            '  } catch (error) {',
            '    "Error creating polygon: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);

        // Store the created item info in session
        sessionManager.setLastCreatedItem({
            type: 'polygon',
            sides: sides,
            position: positioning,
            fillColor: fillColor,
            strokeColor: strokeColor,
            strokeWidth: strokeWidth
        });

        return formatResponse(result, "Create Polygon");
    }

    /**
     * Place an image on the active page with enhanced options
     */
    static async placeImage(args) {
        const {
            filePath,
            x,
            y,
            width,
            height,
            applyObjectStyle = ''
        } = args;

        const positioning = sessionManager.getCalculatedPositioning({ x, y, width, height });

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const page = doc.pages.item(0);
            const rect = page.rectangles.add();
            rect.geometricBounds = [${positioning.y}, ${positioning.x}, ${positioning.y + positioning.height}, ${positioning.x + positioning.width}];

            try {
                rect.place(${JSON.stringify(filePath)});

                const objectStyleName = ${JSON.stringify(applyObjectStyle)};
                if (objectStyleName) {
                    try {
                        const oStyle = doc.objectStyles.itemByName(objectStyleName);
                        if (oStyle.isValid) rect.appliedObjectStyle = oStyle;
                    } catch(e) {}
                }

                return { success: true, message: 'Image placed at ' + ${JSON.stringify(filePath)} };
            } catch(e) {
                rect.remove();
                return { success: false, error: 'Failed to place image: ' + e.message };
            }
        `;

        const result = await ScriptExecutor.executeViaUXP(code);

        if (result?.success) {
            sessionManager.setLastCreatedItem({
                type: 'image',
                filePath: filePath,
                position: positioning,
                objectStyle: applyObjectStyle
            });
        }

        return result?.success ?
            formatResponse(result.message, "Place Image") :
            formatErrorResponse(result?.error || 'Failed to place image', "Place Image");
    }

    /**
     * Create an object style
     */
    static async createObjectStyle(args) {
        const {
            name,
            fillColor,
            strokeColor,
            strokeWeight = 1,
            cornerRadius = 0,
            transparency = 100
        } = args;

        const escapedName = escapeJsxString(name);

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '',
            '  try {',
            `    var objectStyle = doc.objectStyles.add({name: "${escapedName}"});`,
            '',
            '    // Apply fill color',
            `    if ("${fillColor}" !== "") {`,
            '      try {',
            `        objectStyle.fillColor = doc.colors.itemByName("${fillColor}");`,
            '      } catch (colorError) {',
            '        // Use default color if specified color not found',
            '      }',
            '    }',
            '',
            '    // Apply stroke color',
            `    if ("${strokeColor}" !== "") {`,
            '      try {',
            `        objectStyle.strokeColor = doc.colors.itemByName("${strokeColor}");`,
            `        objectStyle.strokeWeight = ${strokeWeight};`,
            '      } catch (colorError) {',
            '        // Use default stroke if specified color not found',
            '      }',
            '    }',
            '',
            '    // Apply corner radius',
            `    if (${cornerRadius} > 0) {`,
            `      objectStyle.topLeftCornerOption = CornerOptions.ROUNDED_CORNER;`,
            `      objectStyle.topRightCornerOption = CornerOptions.ROUNDED_CORNER;`,
            `      objectStyle.bottomLeftCornerOption = CornerOptions.ROUNDED_CORNER;`,
            `      objectStyle.bottomRightCornerOption = CornerOptions.ROUNDED_CORNER;`,
            `      objectStyle.cornerRadius = ${cornerRadius};`,
            '    }',
            '',
            '    // Apply transparency',
            `    if (${transparency} < 100) {`,
            `      objectStyle.transparencySettings.blendingSettings.opacity = ${transparency};`,
            '    }',
            '',
            `    "Object style '${escapedName}' created successfully";`,
            '  } catch (error) {',
            '    "Error creating object style: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Create Object Style");
    }

    /**
     * List all object styles
     */
    static async listObjectStyles() {
        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var info = "=== OBJECT STYLES ===\\n";',
            '',
            '  for (var i = 0; i < doc.objectStyles.length; i++) {',
            '    var style = doc.objectStyles[i];',
            '    if (style.isValid) {',
            '      info += "Name: " + style.name + "\\n";',
            '      info += "  Fill Color: " + (style.fillColor ? style.fillColor.name : "None") + "\\n";',
            '      info += "  Stroke Color: " + (style.strokeColor ? style.strokeColor.name : "None") + "\\n";',
            '      info += "  Stroke Weight: " + style.strokeWeight + "\\n";',
            '      info += "  Corner Radius: " + style.cornerRadius + "\\n\\n";',
            '    }',
            '  }',
            '',
            '  info;',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "List Object Styles");
    }

    /**
     * Apply object style to a page item
     */
    static async applyObjectStyle(args) {
        const {
            styleName,
            itemType = 'rectangle',
            itemIndex = 0
        } = args;

        const escapedStyleName = escapeJsxString(styleName);

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var page = doc.pages[0];',
            '',
            '  try {',
            `    var objectStyle = doc.objectStyles.itemByName("${escapedStyleName}");`,
            '    if (!objectStyle.isValid) {',
            `      "Object style '${escapedStyleName}' not found";`,
            '    } else {',
            `      var item;`,
            `      if ("${itemType}" === "rectangle") {`,
            `        if (${itemIndex} >= page.rectangles.length) {`,
            '          "Rectangle index out of range";',
            '        } else {',
            `          item = page.rectangles[${itemIndex}];`,
            '        }',
            `      } else if ("${itemType}" === "ellipse") {`,
            `        if (${itemIndex} >= page.ovals.length) {`,
            '          "Ellipse index out of range";',
            '        } else {',
            `          item = page.ovals[${itemIndex}];`,
            '        }',
            `      } else if ("${itemType}" === "polygon") {`,
            `        if (${itemIndex} >= page.polygons.length) {`,
            '          "Polygon index out of range";',
            '        } else {',
            `          item = page.polygons[${itemIndex}];`,
            '        }',
            '      } else {',
            '        "Invalid item type. Use: rectangle, ellipse, or polygon";',
            '      }',
            '',
            '      if (item) {',
            '        item.appliedObjectStyle = objectStyle;',
            `        "Object style '${escapedStyleName}' applied successfully";`,
            '      }',
            '    }',
            '  } catch (error) {',
            '    "Error applying object style: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Apply Object Style");
    }

    /**
     * Get image information
     */
    static async getImageInfo(args) {
        const { itemIndex = 0 } = args;

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var page = doc.pages[0];',
            '  var info = "=== IMAGE INFORMATION ===\\n";',
            '',
            '  try {',
            '    // Find images in rectangles',
            '    var imageCount = 0;',
            '    for (var i = 0; i < page.rectangles.length; i++) {',
            '      var rect = page.rectangles[i];',
            '      if (rect.graphics.length > 0) {',
            '        for (var j = 0; j < rect.graphics.length; j++) {',
            '          var graphic = rect.graphics[j];',
            '          if (graphic.constructor.name === "Image") {',
            `            if (imageCount === ${itemIndex}) {`,
            '              info += "Image " + imageCount + ":\\n";',
            '              info += "  File Path: " + graphic.itemLink.filePath + "\\n";',
            '              info += "  File Name: " + graphic.itemLink.name + "\\n";',
            '              info += "  Link Status: " + graphic.itemLink.status + "\\n";',
            '              info += "  Image Type: " + graphic.imageTypeName + "\\n";',
            '              info += "  Actual PPI: " + graphic.actualPpi + "\\n";',
            '              info += "  Effective PPI: " + graphic.effectivePpi + "\\n";',
            '              info += "  Geometric Bounds: " + graphic.geometricBounds + "\\n";',
            '              info += "  Visible Bounds: " + graphic.visibleBounds + "\\n";',
            '              break;',
            '            }',
            '            imageCount++;',
            '          }',
            '        }',
            '      }',
            '    }',
            '',
            `    if (imageCount === 0) {`,
            '      "No images found on page";',
            `    } else if (imageCount <= ${itemIndex}) {`,
            `      "Image index ${itemIndex} not found. Total images: " + imageCount;`,
            '    } else {',
            '      info;',
            '    }',
            '  } catch (error) {',
            '    "Error getting image information: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Get Image Info");
    }
} 