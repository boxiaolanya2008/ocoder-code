import { marked, Renderer } from 'marked';
import hljs from 'highlight.js';

let lastRendered = '';

marked.setOptions({
  gfm: true,
  breaks: true,
});

const renderer = new Renderer();
renderer.code = function(code: string, lang?: string): string {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  const highlighted = hljs.highlight(code, { language }).value;
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
};
marked.use({ renderer });

export async function renderMarkdown(content: string): Promise<void> {
  const html = marked.parse(content) as string;
  const ansi = htmlToAnsi(html);
  console.log(ansi);
}

function htmlToAnsi(html: string): string {
  let result = html;

  result = result.replace(/<pre><code class="hljs language-(\w+)">([\s\S]*?)<\/code><\/pre>/g, (_, lang, code) => {
    return code
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  });

  result = result.replace(/<strong>(.*?)<\/strong>/g, '\x1b[1m$1\x1b[0m');
  result = result.replace(/<em>(.*?)<\/em>/g, '\x1b[3m$1\x1b[0m');
  result = result.replace(/<code>(.*?)<\/code>/g, '\x1b[36m$1\x1b[0m');
  result = result.replace(/<a href="(.*?)">(.*?)<\/a>/g, '\x1b[34m$2\x1b[0m (\x1b[36m$1\x1b[0m)');
  result = result.replace(/<li>(.*?)<\/li>/g, '  - $1');
  result = result.replace(/<ul>|<\/ul>|<ol>|<\/ol>/g, '');
  result = result.replace(/<p>(.*?)<\/p>/g, '$1\n');
  result = result.replace(/<br\s*\/?>/g, '\n');
  result = result.replace(/<.*?>/g, '');
  result = result.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

  return result.trim();
}

export async function streamRender(
  chunk: string,
  onChunk: (text: string) => void
): Promise<void> {
  const html = marked.parse(chunk) as string;
  const ansi = htmlToAnsi(html);
  
  if (ansi !== lastRendered) {
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
    process.stdout.write(ansi);
    lastRendered = ansi;
  }
}

export function clearRender(): void {
  lastRendered = '';
}
