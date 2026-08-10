/**
 * Color resolution utilities.
 *
 * InDesign's scripting API has no direct RGB color space usable from these
 * generated scripts (ColorModel/ColorSpace enums throw ReferenceError inside
 * the UXP sandbox). doc.colors.add({name}) defaults to CMYK process color,
 * so hex input is converted to CMYK in Node before being embedded as literal
 * numbers — the same approach createColorSwatch already uses successfully.
 */

const HEX_PATTERN = /^#([0-9a-fA-F]{6})$/;

/**
 * Converts a hex color string to CMYK percentages (0-100, rounded).
 * @param {string} hex - e.g. "#ff7f00"
 * @returns {{cyan: number, magenta: number, yellow: number, black: number}}
 */
export function hexToCmyk(hex) {
    const match = HEX_PATTERN.exec(hex);
    if (!match) throw new Error(`Invalid hex color: ${hex}`);
    const r = parseInt(match[1].slice(0, 2), 16) / 255;
    const g = parseInt(match[1].slice(2, 4), 16) / 255;
    const b = parseInt(match[1].slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const k = 1 - max;
    const c = max === 0 ? 0 : (max - r) / max;
    const m = max === 0 ? 0 : (max - g) / max;
    const y = max === 0 ? 0 : (max - b) / max;

    return {
        cyan: Math.round(c * 100),
        magenta: Math.round(m * 100),
        yellow: Math.round(y * 100),
        black: Math.round(k * 100)
    };
}

/**
 * Generates a UXP script fragment that resolves `colorValue` (hex or swatch
 * name) to a Color object bound to `varName`, or null if it can't be
 * resolved. Never throws — callers must guard on `${varName}` before use.
 *
 * Hex colors get an auto-created/reused swatch named "Hex RRGGBB" so repeat
 * calls with the same hex don't pile up duplicate swatches.
 *
 * @param {string} varName - JS variable name to bind the result to (must be a valid identifier, unique in the surrounding scope)
 * @param {string|undefined|null} colorValue - hex string or existing swatch name
 * @returns {string} UXP script fragment
 */
export function colorResolverSnippet(varName, colorValue) {
    if (!colorValue) return `let ${varName} = null;`;

    const match = HEX_PATTERN.exec(colorValue);
    if (match) {
        const { cyan, magenta, yellow, black } = hexToCmyk(colorValue);
        const swatchName = `Hex ${match[1].toUpperCase()}`;
        return `
            let ${varName} = null;
            try {
                ${varName} = doc.colors.itemByName(${JSON.stringify(swatchName)});
                if (!${varName}.isValid) throw new Error('missing');
            } catch (e) {
                try {
                    ${varName} = doc.colors.add({ name: ${JSON.stringify(swatchName)} });
                    ${varName}.colorValue = [${cyan}, ${magenta}, ${yellow}, ${black}];
                } catch (e2) { ${varName} = null; }
            }
        `;
    }

    return `
        let ${varName} = null;
        try {
            ${varName} = doc.colors.itemByName(${JSON.stringify(colorValue)});
            if (!${varName}.isValid) ${varName} = null;
        } catch (e) { ${varName} = null; }
    `;
}
