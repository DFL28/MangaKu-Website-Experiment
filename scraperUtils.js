/**
 * Picks the best image URL from a Cheerio element.
 * It checks for 'src', 'data-src', 'data-lazy-src', and 'srcset' attributes in order.
 * @param {cheerio.Cheerio} imageElement - The Cheerio element for the <img> tag.
 * @returns {string|null} The best available image URL or null if not found.
 */
function pickImage(imageElement) {
    if (!imageElement || imageElement.length === 0) return null;
    
    // Replace optional chaining with compatible syntax
    const src = imageElement.attr('src');
    const dataSrc = imageElement.attr('data-src');
    const dataLazySrc = imageElement.attr('data-lazy-src');
    const srcset = imageElement.attr('srcset');
    
    // Process srcset to get first URL
    let firstSrcset = null;
    if (srcset) {
        const srcsetParts = srcset.trim().split(',')[0].split(' ')[0];
        firstSrcset = srcsetParts;
    }
    
    return (dataSrc && dataSrc.trim()) || 
           (dataLazySrc && dataLazySrc.trim()) || 
           (src && src.trim()) || 
           firstSrcset || 
           null;
}

module.exports = { pickImage };