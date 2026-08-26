import { describe, it, expect } from 'vitest';
import {
  runWidgetVerification,
  isSelfContainedHtml,
  verifyDocumentCsp,
  VERIFY_MAX_BYTES,
} from './verify-suite.js';

const VALID_HTML = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-x'; style-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; base-uri 'none';">
<script>const w = { apiVersion: 'open-edu.widget/1' };</script>`;

describe('runWidgetVerification', () => {
  it('passes a minimal valid self-contained document', () => {
    const result = runWidgetVerification(VALID_HTML);
    expect(result).toEqual({
      protocol: true,
      sizeOk: true,
      cspOk: true,
      noAllowSameOrigin: true,
    });
  });

  it('VERIFY_MAX_BYTES is 64 KiB', () => {
    expect(VERIFY_MAX_BYTES).toBe(64 * 1024);
  });

  it('sizeOk is false when the document exceeds 64 KiB', () => {
    const big = `${VALID_HTML}\n<!--${'x'.repeat(VERIFY_MAX_BYTES)}-->`;
    const result = runWidgetVerification(big);
    expect(result.protocol).toBe(true);
    expect(result.sizeOk).toBe(false);
  });

  it('protocol is false when apiVersion is missing', () => {
    const html = `<meta http-equiv="Content-Security-Policy" content="connect-src 'none'; frame-src 'none';"><script></script>`;
    expect(runWidgetVerification(html).protocol).toBe(false);
  });

  it('cspOk is false when connect-src "none" or frame-src "none" is missing', () => {
    const noConnect = `<script>const w={apiVersion:'open-edu.widget/1'};</script><meta http-equiv="Content-Security-Policy" content="frame-src 'none'">`;
    expect(runWidgetVerification(noConnect).cspOk).toBe(false);

    const noFrame = `<script>const w={apiVersion:'open-edu.widget/1'};</script><meta http-equiv="Content-Security-Policy" content="connect-src 'none'">`;
    expect(runWidgetVerification(noFrame).cspOk).toBe(false);
  });

  it('noAllowSameOrigin is false when an iframe carries allow-same-origin', () => {
    const html = `<script>const w={apiVersion:'open-edu.widget/1'};</script>
<meta http-equiv="Content-Security-Policy" content="connect-src 'none'; frame-src 'none';">
<iframe sandbox="allow-scripts allow-same-origin"></iframe>`;
    expect(runWidgetVerification(html).noAllowSameOrigin).toBe(false);
  });

  it('noAllowSameOrigin is true when an iframe does not allow same-origin', () => {
    const html = `<script>const w={apiVersion:'open-edu.widget/1'};</script>
<meta http-equiv="Content-Security-Policy" content="connect-src 'none'; frame-src 'none';">
<iframe sandbox="allow-scripts"></iframe>`;
    expect(runWidgetVerification(html).noAllowSameOrigin).toBe(true);
  });
});

describe('isSelfContainedHtml', () => {
  it('rejects a relative src', () => {
    const result = isSelfContainedHtml(`<script src="./x.js"></script>`);
    expect(result.ok).toBe(false);
    expect(result.offending).toBe('./x.js');
  });

  it('rejects a relative href', () => {
    const result = isSelfContainedHtml(`<link href="../style.css">`);
    expect(result.ok).toBe(false);
    expect(result.offending).toBe('../style.css');
  });

  it('rejects a plain (scheme-less relative) src', () => {
    const result = isSelfContainedHtml(`<script src="assets/main.js"></script>`);
    expect(result.ok).toBe(false);
    expect(result.offending).toBe('assets/main.js');
  });

  it('rejects http: (non-https absolute) src', () => {
    const result = isSelfContainedHtml(`<script src="http://evil.example/x.js"></script>`);
    expect(result.ok).toBe(false);
    expect(result.offending).toBe('http://evil.example/x.js');
  });

  it('accepts data: and absolute https: src/href', () => {
    const html = `<img src="data:image/png;base64,AAAA">
<link rel="stylesheet" href="https://cdn.example/app.css">`;
    expect(isSelfContainedHtml(html)).toEqual({ ok: true });
  });

  it('accepts fragment hrefs', () => {
    expect(isSelfContainedHtml(`<a href="#section">go</a>`)).toEqual({ ok: true });
  });

  it('accepts a doc with no src/href at all', () => {
    expect(isSelfContainedHtml(`<script>const w = {};</script>`)).toEqual({ ok: true });
  });
});

describe('verifyDocumentCsp', () => {
  it('passes when the HTML has a valid CSP meta', () => {
    const html = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src 'none'; frame-src 'none';">`;
    expect(verifyDocumentCsp(html)).toBe(true);
  });

  it('passes when a cspHeader string is supplied with no meta', () => {
    const html = `<script>const w = {};</script>`;
    const header = `default-src 'none'; connect-src 'none'; frame-src 'none'`;
    expect(verifyDocumentCsp(html, header)).toBe(true);
  });

  it('fails when neither meta nor header is present', () => {
    expect(verifyDocumentCsp(`<script></script>`)).toBe(false);
  });

  it('fails when meta lacks one of the required directives', () => {
    const html = `<meta http-equiv="Content-Security-Policy" content="connect-src 'none';">`;
    expect(verifyDocumentCsp(html)).toBe(false);
  });

  it('rejects connect-src with extra sources (CSP directive injection)', () => {
    const html = `<meta http-equiv="Content-Security-Policy" content="connect-src 'none' https://evil.example; frame-src 'none';">`;
    expect(verifyDocumentCsp(html)).toBe(false);
  });

  it('rejects frame-src with extra sources (CSP directive injection)', () => {
    const html = `<meta http-equiv="Content-Security-Policy" content="connect-src 'none'; frame-src 'none' https://evil.example;">`;
    expect(verifyDocumentCsp(html)).toBe(false);
  });

  it('accepts multiple directives where each is exactly none', () => {
    const html = `<meta http-equiv="Content-Security-Policy" content="connect-src 'none'; frame-src 'none';">`;
    expect(verifyDocumentCsp(html)).toBe(true);
  });

  it('accepts connect-src none alone', () => {
    const header = `connect-src 'none'; frame-src 'none'`;
    expect(verifyDocumentCsp(`<script></script>`, header)).toBe(true);
  });

  it('works regardless of attribute order in meta tag', () => {
    const html = `<meta content="connect-src 'none'; frame-src 'none';" http-equiv="Content-Security-Policy">`;
    expect(verifyDocumentCsp(html)).toBe(true);
  });
});
