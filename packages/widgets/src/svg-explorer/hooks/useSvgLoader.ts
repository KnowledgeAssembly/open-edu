import { useState, useEffect, useRef } from 'react';
import type { SvgRegion } from '../types.js';
import { parseSvgRegions, stripRegionsFromSvg } from '../utils/svg-parsing.js';

export interface UseSvgLoaderOptions {
  src: string;
  regionIds: string[];
}

export interface UseSvgLoaderResult {
  loading: boolean;
  error: string | null;
  svgElement: SVGSVGElement | null;
  regions: Map<string, SvgRegion>;
  viewBox: { x: number; y: number; width: number; height: number };
  backgroundHtml: string | null;
}

export function useSvgLoader({ src, regionIds }: UseSvgLoaderOptions): UseSvgLoaderResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);
  const [regions, setRegions] = useState<Map<string, SvgRegion>>(new Map());
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [backgroundHtml, setBackgroundHtml] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const regionKey = regionIds.join(',');

  useEffect(() => {
    cancelledRef.current = false;
    setLoading(true);
    setError(null);
    setSvgElement(null);
    setRegions(new Map());

    async function load() {
      try {
        let svgString: string;

        if (src.trimStart().startsWith('<svg')) {
          svgString = src;
        } else {
          const response = await fetch(src);
          if (!response.ok) {
            throw new Error(`Failed to load SVG: ${response.status} ${response.statusText}`);
          }
          svgString = await response.text();
        }

        if (cancelledRef.current) return;

        const result = parseSvgRegions(svgString, regionIds);
        setSvgElement(result.svgElement);
        setRegions(result.regions);
        setViewBox(result.viewBox);
        setBackgroundHtml(stripRegionsFromSvg(result.svgElement, regionIds));
        setError(null);
      } catch (err) {
        if (!cancelledRef.current) {
          setError(err instanceof Error ? err.message : 'Unknown error loading SVG');
        }
      } finally {
        if (!cancelledRef.current) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelledRef.current = true;
    };
  }, [src, regionKey]);

  return { loading, error, svgElement, regions, viewBox, backgroundHtml };
}
