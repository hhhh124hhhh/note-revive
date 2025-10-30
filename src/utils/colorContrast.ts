/**
 * 颜色对比度工具函数
 * 用于确保文字在背景色上的可读性
 */

/**
 * 将十六进制颜色转换为RGB值
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * 计算颜色的相对亮度（Relative Luminance）
 * 根据WCAG 2.0标准
 */
export const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * 计算两个颜色之间的对比度
 * 返回值范围：1-21
 * WCAG AA标准要求至少4.5:1，AAA标准要求至少7:1
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * 判断颜色是亮色还是暗色
 * 基于相对亮度阈值0.5
 */
export const isLightColor = (color: string): boolean => {
  const rgb = hexToRgb(color);
  if (!rgb) return true;

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.5;
};

/**
 * 为背景色选择合适的文字颜色
 * 确保满足WCAG AA标准（4.5:1对比度）
 */
export const getTextColor = (backgroundColor: string): string => {
  const white = '#ffffff';
  const black = '#000000';

  const whiteContrast = getContrastRatio(white, backgroundColor);
  const blackContrast = getContrastRatio(black, backgroundColor);

  // 选择对比度更高的颜色
  return whiteContrast > blackContrast ? white : black;
};

/**
 * 为标签背景色智能选择文字颜色
 * 考虑常见的标签颜色，确保可读性
 */
export const getTagTextColor = (backgroundColor: string): string => {
  // 预定义一些常见标签颜色的最佳文字颜色
  const predefinedColors: Record<string, string> = {
    '#3b82f6': '#ffffff', // 蓝色 - 白色文字
    '#10b981': '#ffffff', // 绿色 - 白色文字
    '#f59e0b': '#000000', // 橙色 - 黑色文字
    '#ef4444': '#ffffff', // 红色 - 白色文字
    '#8b5cf6': '#ffffff', // 紫色 - 白色文字
    '#06b6d4': '#ffffff', // 青色 - 白色文字
    '#84cc16': '#000000', // 青绿色 - 黑色文字
    '#f97316': '#000000', // 橙红色 - 黑色文字
    '#ec4899': '#ffffff', // 粉色 - 白色文字
    '#6366f1': '#ffffff', // 靛蓝色 - 白色文字
  };

  // 如果有预定义的最佳颜色，直接使用
  if (predefinedColors[backgroundColor.toLowerCase()]) {
    return predefinedColors[backgroundColor.toLowerCase()];
  }

  // 否则使用自动对比度检测
  return getTextColor(backgroundColor);
};

/**
 * 检查颜色对比度是否符合WCAG AA标准
 */
export const meetsWCAG_AA = (foregroundColor: string, backgroundColor: string): boolean => {
  const ratio = getContrastRatio(foregroundColor, backgroundColor);
  return ratio >= 4.5;
};

/**
 * 检查颜色对比度是否符合WCAG AAA标准
 */
export const meetsWCAG_AAA = (foregroundColor: string, backgroundColor: string): boolean => {
  const ratio = getContrastRatio(foregroundColor, backgroundColor);
  return ratio >= 7;
};

/**
 * 获取颜色的HSL值
 */
export const hexToHsl = (hex: string): { h: number; s: number; l: number } | null => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  let { r, g, b } = rgb;
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

/**
 * 调整颜色的亮度
 * 用于创建更亮或更暗的变体
 */
export const adjustBrightness = (hex: string, percent: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = percent > 0 ? 1 + percent : 1 + percent;
  const { r, g, b } = rgb;

  const newR = Math.min(255, Math.max(0, Math.round(r * factor)));
  const newG = Math.min(255, Math.max(0, Math.round(g * factor)));
  const newB = Math.min(255, Math.max(0, Math.round(b * factor)));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};