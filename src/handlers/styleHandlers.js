/**
 * Style management handlers
 */
import { ScriptExecutor } from '../core/scriptExecutor.js';
import { formatResponse, formatErrorResponse } from '../utils/stringUtils.js';
import { sessionManager } from '../core/sessionManager.js';
import { colorResolverSnippet } from '../utils/colorUtils.js';

export class StyleHandlers {
    /**
     * Create a paragraph style
     */
    static async createParagraphStyle(args) {
        const {
            name,
            fontFamily = 'Arial\tRegular',
            fontSize = 12,
            textColor = 'Black',
            alignment = 'LEFT_ALIGN',
            leading,
            spaceBefore,
            spaceAfter
        } = args;

        const code = `
            const { Justification } = require('indesign');
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            const style = doc.paragraphStyles.add({ name: ${JSON.stringify(name)} });
            try {
                style.appliedFont = app.fonts.itemByName(${JSON.stringify(fontFamily)});
            } catch (e) {
                style.appliedFont = app.fonts.itemByName('Arial\\tRegular');
            }
            style.pointSize = ${fontSize};
            if (${JSON.stringify(textColor)} !== 'Black') {
                ${colorResolverSnippet('_textColor', textColor)}
                if (_textColor) style.fillColor = _textColor;
            }
            const alignMap = {
                CENTER_ALIGN: Justification.centerAlign,
                RIGHT_ALIGN: Justification.rightAlign,
                JUSTIFY: Justification.fullyJustified,
                LEFT_ALIGN: Justification.leftAlign
            };
            style.justification = alignMap[${JSON.stringify(alignment)}] || Justification.leftAlign;
            ${leading !== undefined ? `style.leading = ${leading};` : ''}
            ${spaceBefore !== undefined ? `style.spaceBefore = ${spaceBefore};` : ''}
            ${spaceAfter !== undefined ? `style.spaceAfter = ${spaceAfter};` : ''}
            return {
                success: true,
                name: style.name,
                font: style.appliedFont.name,
                size: style.pointSize
            };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Create Paragraph Style")
            : formatErrorResponse(result?.error || 'Failed to create paragraph style', "Create Paragraph Style");
    }

    /**
     * Create a character style
     */
    static async createCharacterStyle(args) {
        const {
            name,
            fontFamily = 'Arial\tRegular',
            fontSize = 12,
            textColor = 'Black',
            bold = false,
            italic = false,
            underline = false
        } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            const style = doc.characterStyles.add({ name: ${JSON.stringify(name)} });
            try {
                style.appliedFont = app.fonts.itemByName(${JSON.stringify(fontFamily)});
            } catch (e) {
                style.appliedFont = app.fonts.itemByName('Arial\\tRegular');
            }
            style.pointSize = ${fontSize};
            if (${JSON.stringify(textColor)} !== 'Black') {
                ${colorResolverSnippet('_textColor', textColor)}
                if (_textColor) style.fillColor = _textColor;
            }
            style.fontStyle = ${JSON.stringify(bold && italic ? 'Bold Italic' : bold ? 'Bold' : italic ? 'Italic' : 'Regular')};
            style.underline = ${underline};
            style.underlineOffset = ${underline ? 1 : 0};
            style.underlineWeight = ${underline ? 1 : 0};
            return {
                success: true,
                name: style.name,
                font: style.appliedFont.name,
                size: style.pointSize,
                fontStyle: style.fontStyle
            };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Create Character Style")
            : formatErrorResponse(result?.error || 'Failed to create character style', "Create Character Style");
    }

    /**
     * Apply a paragraph style to text
     */
    static async applyParagraphStyle(args) {
        const { styleName, frameIndex = 0 } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            const page = doc.pages.item(0);
            if (${frameIndex} >= page.textFrames.length) return { success: false, error: 'Text frame index out of range' };
            const textFrame = page.textFrames.item(${frameIndex});
            const style = doc.paragraphStyles.itemByName(${JSON.stringify(styleName)});
            if (!style.isValid) return { success: false, error: 'Paragraph style not found: ' + ${JSON.stringify(styleName)} };
            textFrame.paragraphs.item(0).appliedParagraphStyle = style;
            return { success: true, styleName: ${JSON.stringify(styleName)} };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Apply Paragraph Style")
            : formatErrorResponse(result?.error || 'Failed to apply paragraph style', "Apply Paragraph Style");
    }

    /**
     * Apply a character style to text
     */
    static async applyCharacterStyle(args) {
        const { styleName, frameIndex = 0, startIndex = 0, endIndex = -1 } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            const page = doc.pages.item(0);
            if (${frameIndex} >= page.textFrames.length) return { success: false, error: 'Text frame index out of range' };
            const textFrame = page.textFrames.item(${frameIndex});
            const style = doc.characterStyles.itemByName(${JSON.stringify(styleName)});
            if (!style.isValid) return { success: false, error: 'Character style not found: ' + ${JSON.stringify(styleName)} };
            if (${endIndex} === -1) {
                textFrame.texts.item(0).appliedCharacterStyle = style;
            } else {
                textFrame.texts.item(0).characters.itemByRange(${startIndex}, ${endIndex}).appliedCharacterStyle = style;
            }
            return { success: true, styleName: ${JSON.stringify(styleName)} };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Apply Character Style")
            : formatErrorResponse(result?.error || 'Failed to apply character style', "Apply Character Style");
    }

    /**
     * List all styles in the document
     */
    static async listStyles(args) {
        const { styleType = 'ALL' } = args;

        const code = `
            const { Justification } = require('indesign');
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            const result = { success: true, styleType: ${JSON.stringify(styleType)} };

            function getAlignmentName(alignment) {
                if (alignment === Justification.leftAlign) return 'LEFT_ALIGN';
                if (alignment === Justification.centerAlign) return 'CENTER_ALIGN';
                if (alignment === Justification.rightAlign) return 'RIGHT_ALIGN';
                if (alignment === Justification.fullyJustified) return 'FULLY_JUSTIFIED';
                return 'UNKNOWN';
            }

            if (${JSON.stringify(styleType)} === 'PARAGRAPH' || ${JSON.stringify(styleType)} === 'ALL') {
                const paraStyles = [];
                for (let i = 0; i < doc.paragraphStyles.length; i++) {
                    const style = doc.paragraphStyles.item(i);
                    if (style.isValid) {
                        paraStyles.push({
                            name: style.name,
                            font: (style.appliedFont && style.appliedFont.isValid) ? style.appliedFont.name : '[Not set]',
                            size: style.pointSize,
                            alignment: getAlignmentName(style.justification),
                            color: (style.fillColor && style.fillColor.isValid) ? style.fillColor.name : null
                        });
                    }
                }
                result.paragraphStyles = paraStyles;
            }

            if (${JSON.stringify(styleType)} === 'CHARACTER' || ${JSON.stringify(styleType)} === 'ALL') {
                const charStyles = [];
                for (let i = 0; i < doc.characterStyles.length; i++) {
                    const style = doc.characterStyles.item(i);
                    if (style.isValid) {
                        charStyles.push({
                            name: style.name,
                            font: (style.appliedFont && style.appliedFont.isValid) ? style.appliedFont.name : '[Not set]',
                            size: style.pointSize,
                            fontStyle: style.fontStyle,
                            color: (style.fillColor && style.fillColor.isValid) ? style.fillColor.name : null
                        });
                    }
                }
                result.characterStyles = charStyles;
            }

            return result;
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "List Styles")
            : formatErrorResponse(result?.error || 'Failed to list styles', "List Styles");
    }

    /**
     * Create a color swatch
     */
    static async createColorSwatch(args) {
        const {
            name,
            colorType = 'PROCESS',
            red,
            green,
            blue
        } = args;

        // Convert RGB to CMYK using proper formula (done in Node.js, values embedded in UXP code)
        const r = red / 255;
        const g = green / 255;
        const b = blue / 255;

        const max = Math.max(r, g, b);
        const k = 1 - max;
        const c = max === 0 ? 0 : (max - r) / max;
        const m = max === 0 ? 0 : (max - g) / max;
        const y = max === 0 ? 0 : (max - b) / max;

        const cyan = Math.round(c * 100);
        const magenta = Math.round(m * 100);
        const yellow = Math.round(y * 100);
        const black = Math.round(k * 100);

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            const color = doc.colors.add({ name: ${JSON.stringify(name)} });
            color.colorValue = [${cyan}, ${magenta}, ${yellow}, ${black}];
            const actualValues = color.colorValue;
            return {
                success: true,
                name: color.name,
                cmyk: actualValues,
                sourceRgb: [${red}, ${green}, ${blue}]
            };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Create Color Swatch")
            : formatErrorResponse(result?.error || 'Failed to create color swatch', "Create Color Swatch");
    }

    /**
     * List all color swatches
     */
    static async listColorSwatches() {
        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            const swatches = [];
            for (let i = 0; i < doc.colors.length; i++) {
                const color = doc.colors.item(i);
                if (color && color.isValid) {
                    const entry = { name: color.name };
                    if (color.colorValue && color.colorValue.length >= 4) {
                        entry.cmyk = color.colorValue;
                    } else if (color.colorValue && color.colorValue.length >= 3) {
                        entry.rgb = color.colorValue;
                    }
                    swatches.push(entry);
                }
            }
            return { success: true, swatches };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "List Color Swatches")
            : formatErrorResponse(result?.error || 'Failed to list color swatches', "List Color Swatches");
    }

    /**
     * Apply a color to text or graphics
     */
    static async applyColor(args) {
        const { colorName, targetType = 'text', frameIndex = 0 } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            const page = doc.pages.item(0);
            const color = doc.colors.itemByName(${JSON.stringify(colorName)});
            if (!color.isValid) return { success: false, error: 'Color not found: ' + ${JSON.stringify(colorName)} };
            const target = ${JSON.stringify(targetType)};
            if (target === 'text') {
                if (${frameIndex} >= page.textFrames.length) return { success: false, error: 'Text frame index out of range' };
                page.textFrames.item(${frameIndex}).texts.item(0).fillColor = color;
            } else if (target === 'rectangle') {
                if (${frameIndex} >= page.rectangles.length) return { success: false, error: 'Rectangle index out of range' };
                page.rectangles.item(${frameIndex}).fillColor = color;
            } else if (target === 'ellipse') {
                if (${frameIndex} >= page.ovals.length) return { success: false, error: 'Ellipse index out of range' };
                page.ovals.item(${frameIndex}).fillColor = color;
            } else {
                return { success: false, error: 'Invalid target type. Use: text, rectangle, or ellipse' };
            }
            return { success: true, colorName: ${JSON.stringify(colorName)}, targetType: target, frameIndex: ${frameIndex} };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Apply Color")
            : formatErrorResponse(result?.error || 'Failed to apply color', "Apply Color");
    }
}
