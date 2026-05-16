import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const origin = request.headers.get('origin') ?? ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin

  const script = generateWidgetScript(slug, appUrl)

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

function generateWidgetScript(slug: string, appUrl: string): string {
  return `(function(){
  var SLUG = ${JSON.stringify(slug)};
  var API = ${JSON.stringify(appUrl)} + '/api/public/vacancies?siteGroup=' + SLUG;
  var BASE = ${JSON.stringify(appUrl)} + '/jobs/' + SLUG + '/';

  var el = document.currentScript && document.currentScript.parentElement;
  if (!el) return;

  var host = document.createElement('div');
  host.setAttribute('data-vacancy-widget', SLUG);
  el.appendChild(host);

  var shadow = host.attachShadow({ mode: 'open' });

  var style = document.createElement('style');
  style.textContent = \`
    :host { display: block; font-family: system-ui, -apple-system, sans-serif; }
    .vw-container { max-width: 640px; }
    .vw-loading { padding: 1rem; color: #666; font-size: 0.875rem; }
    .vw-error { padding: 1rem; color: #dc2626; font-size: 0.875rem; }
    .vw-empty { padding: 1rem; color: #666; font-size: 0.875rem; }
    .vw-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
    .vw-card { border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; text-decoration: none; color: inherit; display: block; transition: box-shadow 0.15s; }
    .vw-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .vw-card:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }
    .vw-title { font-size: 1rem; font-weight: 600; margin: 0 0 0.25rem; color: #111827; }
    .vw-meta { font-size: 0.75rem; color: #6b7280; display: flex; gap: 0.5rem; align-items: center; }
    .vw-badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.625rem; font-weight: 600; color: #fff; }
  \`;
  shadow.appendChild(style);

  var container = document.createElement('div');
  container.className = 'vw-container';
  container.innerHTML = '<div class="vw-loading">Loading vacancies...</div>';
  shadow.appendChild(container);

  fetch(API)
    .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(json) {
      var vacancies = json.data || [];
      if (vacancies.length === 0) {
        container.innerHTML = '<div class="vw-empty">No open positions at this time.</div>';
        return;
      }
      var html = '<ul class="vw-list">';
      vacancies.forEach(function(v) {
        var badge = v.entity ? '<span class="vw-badge" style="background-color:' + (v.entity.colorHex || '#6b7280') + '">' + escHtml(v.entity.name || '') + '</span>' : '';
        html += '<li><a class="vw-card" href="' + BASE + v.id + '" target="_blank" rel="noopener">';
        html += '<p class="vw-title">' + escHtml(v.title) + '</p>';
        html += '<div class="vw-meta">' + badge;
        if (v.location) html += '<span>' + escHtml(v.location) + '</span>';
        if (v.type) html += '<span>' + escHtml(v.type) + '</span>';
        html += '</div></a></li>';
      });
      html += '</ul>';
      container.innerHTML = html;
    })
    .catch(function() {
      container.innerHTML = '<div class="vw-error">Could not load vacancies.</div>';
    });

  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
})();`
}
