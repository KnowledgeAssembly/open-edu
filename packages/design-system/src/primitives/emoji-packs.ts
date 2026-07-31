export type EmojiPackFormat = 'svg' | 'png' | 'native';

export interface EmojiPack {
  id: string;
  name: string;
  format: EmojiPackFormat;
  getUrl?: (hexCodePoint: string) => string;
  fallbackToNative?: boolean;
}

export const NativeEmojiPack: EmojiPack = {
  id: 'native',
  name: 'Native',
  format: 'native',
  fallbackToNative: true,
};

export const OPENMOJI_CDN_BASE_URL =
  'https://cdn.jsdelivr.net/npm/openmoji-static@15.0.0/single_svg';

export interface OpenMojiPackOptions {
  id?: string;
  name?: string;
  baseUrl?: string;
}

export function createOpenMojiPack(options: OpenMojiPackOptions = {}): EmojiPack {
  const baseUrl = options.baseUrl ?? OPENMOJI_CDN_BASE_URL;
  return {
    id: options.id ?? 'openmoji',
    name: options.name ?? 'OpenMoji',
    format: 'svg',
    getUrl: (hexCodePoint: string) => `${baseUrl}/${hexCodePoint}.svg`,
    fallbackToNative: true,
  };
}
